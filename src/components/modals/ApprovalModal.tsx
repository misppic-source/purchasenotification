import React, { useState } from 'react';
import { ArrivalRequest } from '../../types';
import { api } from '../../services/api';
import {
  X,
  CheckCircle2,
  PieChart,
  XCircle,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface ApprovalModalProps {
  request: ArrivalRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  request,
  onClose,
  onSuccess,
}) => {
  if (!request) return null;

  const [decision, setDecision] = useState<'FULL' | 'PARTIAL' | 'REJECT'>('FULL');
  const [verifiedQty, setVerifiedQty] = useState<number>(request.reportedQty);
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [requestCorrection, setRequestCorrection] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (decision === 'FULL') {
        await api.approveFullArrival(request.id, remarks);
      } else if (decision === 'PARTIAL') {
        if (!verifiedQty || verifiedQty <= 0) {
          throw new Error('Please enter a valid verified quantity greater than zero.');
        }
        if (verifiedQty > request.reportedQty) {
          throw new Error('Verified quantity cannot exceed reported quantity.');
        }
        await api.approvePartialArrival(request.id, verifiedQty, remarks);
      } else if (decision === 'REJECT') {
        if (!rejectionReason.trim()) {
          throw new Error('Rejection reason is mandatory.');
        }
        await api.rejectArrivalRequest(request.id, rejectionReason.trim(), requestCorrection);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                {request.id}
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                PPIC Verification
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Verify Arrival: {request.rmCode} — {request.rmDescription}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reported vs Planned Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Planned Date:</span>
              <div className="font-bold text-slate-900">{request.plannedDate}</div>
            </div>
            <div>
              <span className="text-slate-500">Planned Qty:</span>
              <div className="font-bold text-slate-900">{request.plannedQty}</div>
            </div>
            <div>
              <span className="text-slate-500">Current Balance:</span>
              <div className="font-bold text-rose-700">{request.currentBalanceQty}</div>
            </div>
            <div className="bg-amber-100/60 p-1.5 rounded-lg border border-amber-200">
              <span className="text-amber-800 font-bold uppercase text-[10px]">Reported By Purchase:</span>
              <div className="font-extrabold text-amber-950 text-sm">{request.reportedQty}</div>
            </div>
          </div>

          {/* Submission Details */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span>Purchase Submitter:</span>
              <strong>{request.purchaseUserName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Actual Gate Arrival Date:</span>
              <strong>{request.actualArrivalDate}</strong>
            </div>
            <div className="flex justify-between">
              <span>Delivery Challan / Invoice:</span>
              <strong>{request.deliveryChallan || 'N/A'} / {request.invoiceNumber || 'N/A'}</strong>
            </div>
            {request.remarks && (
              <div className="pt-1 border-t border-slate-100 text-slate-600">
                <strong>Purchase Note:</strong> {request.remarks}
              </div>
            )}
          </div>

          {/* Decision Selection Tabs */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Select PPIC Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecision('FULL')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  decision === 'FULL'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${decision === 'FULL' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>APPROVE FULL ({request.reportedQty})</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('PARTIAL')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  decision === 'PARTIAL'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PieChart className={`w-5 h-5 ${decision === 'PARTIAL' ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>APPROVE PARTIAL</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  decision === 'REJECT'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className={`w-5 h-5 ${decision === 'REJECT' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>REJECT / RE-CHECK</span>
              </button>
            </div>
          </div>

          {/* Conditional Decision Form Fields */}
          {decision === 'FULL' && (
            <div className="space-y-3 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs">
              <p className="text-emerald-900">
                Approving <strong>{request.reportedQty}</strong> will update the official receipt database. If balance reaches 0, all future reminders will cease.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PPIC Approval Notes (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Weighbridge slip verified. Batch accepted into warehouse."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {decision === 'PARTIAL' && (
            <div className="space-y-3 p-3 bg-teal-50/50 border border-teal-200 rounded-xl text-xs">
              <div>
                <label className="block font-semibold text-teal-950 mb-1">
                  Verified Quantity to Officially Receive <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={request.reportedQty}
                  value={verifiedQty}
                  onChange={(e) => setVerifiedQty(Number(e.target.value))}
                  className="w-full bg-white border border-teal-300 rounded-lg p-2 font-bold focus:ring-2 focus:ring-teal-500"
                  required
                />
                <span className="text-[11px] text-teal-700 mt-1 block">
                  Reported by Purchase: {request.reportedQty}. Verified received quantity: {verifiedQty}.
                </span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PPIC Verification Notes</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Approved 600 KG after tare deduction. Remaining balance is tracked."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {decision === 'REJECT' && (
            <div className="space-y-3 p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs">
              <div>
                <label className="block font-semibold text-rose-950 mb-1">
                  Reason for Rejection / Correction Request <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Delivery challan weight does not match gate scale. Mill test cert missing..."
                  className="w-full bg-white border border-rose-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-rose-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestCorrection}
                  onChange={(e) => setRequestCorrection(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Allow Purchase team to correct and resubmit with updated documents</span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 ${
                decision === 'FULL'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : decision === 'PARTIAL'
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting
                ? 'Processing...'
                : decision === 'FULL'
                ? 'CONFIRM FULL APPROVAL'
                : decision === 'PARTIAL'
                ? 'CONFIRM PARTIAL APPROVAL'
                : 'SUBMIT REJECTION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { api } from '../../services/api';
import { X, Edit3, AlertCircle, AlertTriangle } from 'lucide-react';

interface EditScheduleModalProps {
  schedule: RMSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  schedule,
  onClose,
  onSuccess,
}) => {
  if (!schedule) return null;

  const [plannedDate, setPlannedDate] = useState(schedule.plannedDate);
  const [plannedQty, setPlannedQty] = useState(schedule.plannedQty);
  const [priority, setPriority] = useState(schedule.priority);
  const [supplier, setSupplier] = useState(schedule.supplier);
  const [poNumber, setPoNumber] = useState(schedule.poNumber);
  const [remarks, setRemarks] = useState(schedule.remarks || '');
  const [changeReason, setChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      setError('Modification reason is required for ISO / manufacturing audit compliance.');
      return;
    }

    if (Number(plannedQty) < schedule.receivedQty) {
      setError(`Planned quantity cannot be reduced below already received quantity (${schedule.receivedQty}).`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.updateSchedule(schedule.id, {
        plannedDate,
        plannedQty: Number(plannedQty),
        priority,
        supplier,
        poNumber,
        remarks,
        changeReason: changeReason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Modify RM Schedule (PPIC Control)
              </h2>
              <p className="text-xs text-slate-500">
                Reschedule dates or adjust planned quantities with permanent audit logging.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reference */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
            <div>
              <span className="text-slate-500">Material:</span>
              <div className="font-mono font-bold text-slate-900">
                {schedule.rmCode} — {schedule.rmDescription}
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Already Received:</span>
              <div className="font-bold text-emerald-700">
                {schedule.receivedQty} {schedule.uom}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Planned Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Planned Quantity ({schedule.uom}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={plannedQty}
                onChange={(e) => setPlannedQty(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PO #</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Reason for Modification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Rescheduled due to supplier machine breakdown / Production plan shift..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'SAVE MODIFICATIONS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

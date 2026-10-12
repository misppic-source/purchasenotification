import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { api } from '../../services/api';
import { X, PlusCircle, AlertCircle } from 'lucide-react';

interface CreateScheduleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [rmCode, setRmCode] = useState('');
  const [rmDescription, setRmDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState(todayStr);
  const [plannedQty, setPlannedQty] = useState<number | ''>('');
  const [uom, setUom] = useState('KG');
  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmCode || !rmDescription || !plannedDate || !plannedQty) {
      setError('Please provide RM Code, Description, Planned Date, and Planned Quantity.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createSchedule({
        rmCode: rmCode.trim(),
        rmDescription: rmDescription.trim(),
        plannedDate,
        plannedQty: Number(plannedQty),
        uom,
        supplier: supplier.trim() || 'TBD',
        poNumber: poNumber.trim() || 'TBD',
        priority,
        remarks: remarks.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create RM schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Create Raw Material Schedule
              </h2>
              <p className="text-xs text-slate-500">
                Direct entry of planned RM arrival by PPIC Planning.
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                RM Code / Child Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={rmCode}
                onChange={(e) => setRmCode(e.target.value)}
                placeholder="e.g. 12000035"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
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
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              RM Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={rmDescription}
              onChange={(e) => setRmDescription(e.target.value)}
              placeholder="e.g. ALU NS CIRCLE 293*2.0MM"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Planned Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={plannedQty}
                onChange={(e) => setPlannedQty(e.target.value ? Number(e.target.value) : '')}
                placeholder="1000"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">UOM</label>
              <input
                type="text"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Supplier / Vendor</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Supplier name"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-9041"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Planning Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Intended for Batch 4 cookware assembly line..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'CREATE SCHEDULE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Truck,
  AlertTriangle,
  Upload,
  CheckCircle2,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface MaterialArrivedModalProps {
  schedule: RMSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const MaterialArrivedModal: React.FC<MaterialArrivedModalProps> = ({
  schedule,
  onClose,
  onSuccess,
}) => {
  if (!schedule) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const [actualArrivalDate, setActualArrivalDate] = useState(todayStr);
  const [reportedQty, setReportedQty] = useState<number | ''>(schedule.balanceQty);
  const [deliveryChallan, setDeliveryChallan] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [grnNumber, setGrnNumber] = useState('');
  const [transportDoc, setTransportDoc] = useState('');
  const [supplier, setSupplier] = useState(schedule.supplier || '');
  const [poNumber, setPoNumber] = useState(schedule.poNumber || '');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachment mock / simulated upload
  const [fileName, setFileName] = useState<string>('');

  const numReported = Number(reportedQty) || 0;
  const isOverReceipt = numReported > schedule.balanceQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedQty || numReported <= 0) {
      setError('Reported quantity must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const attachments = fileName
        ? [
            {
              id: `ATT-${Date.now()}`,
              name: fileName,
              type: 'application/pdf',
              size: 154000,
              uploadedAt: new Date().toISOString(),
              uploadedBy: 'Purchase User',
            },
          ]
        : [];

      await api.submitArrivalRequest({
        scheduleId: schedule.id,
        actualArrivalDate,
        reportedQty: numReported,
        remarks,
        supplier,
        poNumber,
        deliveryChallan,
        invoiceNumber,
        grnNumber,
        transportDoc,
        attachments,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit arrival request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Report Material Arrival (Purchase Form)
              </h2>
              <p className="text-xs text-slate-500">
                Submit gate arrival details for PPIC physical receipt verification.
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reference Banner */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 font-medium">RM Code:</span>
              <div className="font-mono font-bold text-slate-900">{schedule.rmCode}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Planned Date:</span>
              <div className="font-bold text-slate-900">{schedule.plannedDate}</div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Approved Received:</span>
              <div className="font-bold text-emerald-700">
                {schedule.receivedQty} {schedule.uom}
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Current Balance:</span>
              <div className="font-bold text-rose-700">
                {schedule.balanceQty} {schedule.uom}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Crucial Rule:</strong> Submitting this form creates an Arrival Request. Official Received Quantity will update ONLY after PPIC approves.
            </span>
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Actual Arrival Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={actualArrivalDate}
                onChange={(e) => setActualArrivalDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reported Quantity ({schedule.uom}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={reportedQty}
                onChange={(e) => setReportedQty(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Over-receipt alert */}
          {isOverReceipt && (
            <div className="p-3 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>OVER-RECEIPT DETECTED:</span>
              </div>
              <p>
                Reported quantity ({numReported} {schedule.uom}) exceeds the outstanding balance ({schedule.balanceQty} {schedule.uom}) by{' '}
                <strong>{(numReported - schedule.balanceQty).toFixed(2)} {schedule.uom}</strong>. PPIC will be prompted to explicitly review excess quantity.
              </p>
            </div>
          )}

          {/* Supporting Document Details */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Supporting Documents & Logistics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Delivery Challan #</label>
                <input
                  type="text"
                  value={deliveryChallan}
                  onChange={(e) => setDeliveryChallan(e.target.value)}
                  placeholder="e.g. DC-2026-9012"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-88192"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">GRN # (if generated)</label>
                <input
                  type="text"
                  value={grnNumber}
                  onChange={(e) => setGrnNumber(e.target.value)}
                  placeholder="e.g. GRN-4412"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">LR / Transporter Slip #</label>
                <input
                  type="text"
                  value={transportDoc}
                  onChange={(e) => setTransportDoc(e.target.value)}
                  placeholder="e.g. VRL-LR-9981"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Supplier & PO confirmation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">Supplier Name</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">PO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Arrival Remarks / Inspection Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Material unloaded at bay 3. Weighing slip attached. Quality inspection passed..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* File attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attach Supporting Document (DC / Invoice / Weigh Slip)
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Choose Document</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFileName(e.target.files[0].name);
                    }
                  }}
                />
              </label>
              {fileName && (
                <span className="text-xs text-indigo-700 font-medium flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {fileName}
                </span>
              )}
            </div>
          </div>

          {/* Submit buttons */}
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'SUBMIT ARRIVAL REQUEST'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { RMSchedule, ArrivalRequest, Receipt, RemarkRecord, ScheduleHistory, AuditLog, RemarkCategory } from '../../types';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import {
  X,
  Calendar,
  Layers,
  FileText,
  Clock,
  MessageSquare,
  History,
  ShieldAlert,
  Send,
  Building2,
  FileCheck2,
  AlertCircle,
  Paperclip,
} from 'lucide-react';

interface RMDetailsModalProps {
  scheduleId: string | null;
  onClose: () => void;
  onOpenMaterialArrived?: (s: RMSchedule) => void;
  userRole: 'PPIC_ADMIN' | 'PURCHASE_TEAM';
}

export const RMDetailsModal: React.FC<RMDetailsModalProps> = ({
  scheduleId,
  onClose,
  onOpenMaterialArrived,
  userRole,
}) => {
  const [data, setData] = useState<{
    schedule: RMSchedule;
    arrivalRequests: ArrivalRequest[];
    receipts: Receipt[];
    remarks: RemarkRecord[];
    history: ScheduleHistory[];
    auditLogs: AuditLog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'receipts' | 'remarks' | 'history'>('overview');

  // New remark state
  const [remarkText, setRemarkText] = useState('');
  const [remarkCategory, setRemarkCategory] = useState<RemarkCategory>('GENERAL');
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  useEffect(() => {
    if (!scheduleId) return;
    setLoading(true);
    setError(null);
    api
      .getScheduleDetails(scheduleId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load RM details');
      })
      .finally(() => setLoading(false));
  }, [scheduleId]);

  if (!scheduleId) return null;

  const handleAddRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkText.trim() || !data) return;
    setIsSubmittingRemark(true);
    try {
      const res = await api.addRemark({
        scheduleId: data.schedule.id,
        rmCode: data.schedule.rmCode,
        category: remarkCategory,
        remark: remarkText.trim(),
      });
      setData({
        ...data,
        remarks: [...data.remarks, res.remark],
      });
      setRemarkText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add remark');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                {data?.schedule.rmCode || 'Loading...'}
              </span>
              {data && <StatusBadge status={data.schedule.status} size="sm" />}
              {data?.schedule.priority === 'CRITICAL' && (
                <span className="text-xs font-bold uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded">
                  Critical
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-800 mt-1">
              {data?.schedule.rmDescription || 'Loading description...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Overview & Planning</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Arrival Requests ({data?.arrivalRequests.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'receipts'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Official Receipts ({data?.receipts.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('remarks')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'remarks'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Remarks History ({data?.remarks.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Schedule Audit ({data?.history.length || 0})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && (
            <div className="py-16 text-center text-slate-400">Loading comprehensive RM record...</div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Planned Quantity</div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">
                        {data.schedule.plannedQty.toLocaleString()}{' '}
                        <span className="text-xs font-medium text-slate-500">{data.schedule.uom}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <div className="text-[11px] font-bold text-emerald-700 uppercase">PPIC Approved Received</div>
                      <div className="text-xl font-extrabold text-emerald-800 mt-1">
                        {data.schedule.receivedQty.toLocaleString()}{' '}
                        <span className="text-xs font-medium text-emerald-600">{data.schedule.uom}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                      <div className="text-[11px] font-bold text-rose-700 uppercase">Outstanding Balance</div>
                      <div className="text-xl font-extrabold text-rose-800 mt-1">
                        {data.schedule.balanceQty.toLocaleString()}{' '}
                        <span className="text-xs font-medium text-rose-600">{data.schedule.uom}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200">
                      <div className="text-[11px] font-bold text-indigo-700 uppercase">Planned Arrival Date</div>
                      <div className="text-base font-extrabold text-indigo-900 mt-1 font-mono">
                        {data.schedule.plannedDate}
                      </div>
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                        Procurement Information
                      </h4>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Supplier / Vendor:</span>
                        <strong className="text-slate-900">{data.schedule.supplier || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Purchase Order #:</span>
                        <strong className="text-slate-900 font-mono">{data.schedule.poNumber || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Unit of Measure (UOM):</span>
                        <strong className="text-slate-900">{data.schedule.uom}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">Planning Priority:</span>
                        <strong className="text-slate-900">{data.schedule.priority}</strong>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                        System Tracking
                      </h4>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Schedule ID:</span>
                        <strong className="text-slate-900 font-mono text-[11px]">{data.schedule.id}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Planning Version:</span>
                        <strong className="text-slate-900 font-mono">{data.schedule.planningVersion || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Source Plan File:</span>
                        <strong className="text-slate-900">{data.schedule.sourceFile || 'Direct Creation'}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500 font-medium">Last Status Recalculation:</span>
                        <strong className="text-slate-900">{new Date(data.schedule.updatedAt).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Remarks Summary */}
                  {data.schedule.remarks && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <strong>Planning Notes:</strong> {data.schedule.remarks}
                    </div>
                  )}

                  {/* Actions for Purchase */}
                  {userRole === 'PURCHASE_TEAM' && data.schedule.status !== 'CANCELLED' && data.schedule.balanceQty > 0 && onOpenMaterialArrived && (
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900">Material Arrived at Gate?</h4>
                        <p className="text-[11px] text-indigo-700">
                          Submit an official Arrival Request with delivery challan and invoice to initiate PPIC verification.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenMaterialArrived(data.schedule);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0"
                      >
                        REPORT MATERIAL ARRIVAL
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ARRIVAL REQUESTS */}
              {activeTab === 'requests' && (
                <div className="space-y-4">
                  {data.arrivalRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No arrival requests submitted by Purchase yet.
                    </div>
                  ) : (
                    data.arrivalRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">{req.id}</span>
                              <StatusBadge status={req.status} size="sm" />
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Submitted by <strong>{req.purchaseUserName}</strong> on{' '}
                              {new Date(req.submittedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-slate-500 font-medium uppercase">Reported Quantity</div>
                            <div className="text-base font-extrabold text-slate-900">
                              {req.reportedQty.toLocaleString()} {data.schedule.uom}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg">
                          <div>
                            <span className="text-slate-500">Arrival Date:</span>
                            <div className="font-semibold text-slate-800">{req.actualArrivalDate}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Challan #:</span>
                            <div className="font-semibold text-slate-800">{req.deliveryChallan || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Invoice #:</span>
                            <div className="font-semibold text-slate-800">{req.invoiceNumber || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">GRN #:</span>
                            <div className="font-semibold text-slate-800">{req.grnNumber || 'N/A'}</div>
                          </div>
                        </div>

                        {req.remarks && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                            <span className="font-semibold text-slate-700">Purchase Remarks:</span> {req.remarks}
                          </div>
                        )}

                        {/* Review decision details if reviewed */}
                        {req.reviewedAt && (
                          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-1">
                            <div className="flex justify-between font-bold text-indigo-950">
                              <span>
                                Reviewed by PPIC ({req.reviewedByName || req.reviewedBy}):
                              </span>
                              <span>Approved Qty: {req.approvedQty ?? 0} {data.schedule.uom}</span>
                            </div>
                            {req.reviewerRemarks && (
                              <div className="text-indigo-800">
                                <strong>Remarks:</strong> {req.reviewerRemarks}
                              </div>
                            )}
                            {req.rejectionReason && (
                              <div className="text-rose-700">
                                <strong>Rejection Reason:</strong> {req.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: OFFICIAL RECEIPTS */}
              {activeTab === 'receipts' && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                    <strong>Official Receipt Principle:</strong> Only quantities approved by PPIC are officially recognized in inventory and reduce the planning balance.
                  </div>

                  {data.receipts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No official receipts recorded for this schedule yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {data.receipts.map((rcp) => (
                        <div key={rcp.id} className="p-4 bg-white flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">{rcp.id}</span>
                              <span className="text-[11px] text-slate-500">Date: {rcp.receiptDate}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              Approved by <strong>{rcp.approvedByName}</strong> ({new Date(rcp.createdAt).toLocaleDateString()})
                            </div>
                            {rcp.notes && (
                              <div className="text-xs text-slate-500 italic mt-0.5">{rcp.notes}</div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-base font-extrabold text-emerald-700">
                              +{rcp.approvedQty.toLocaleString()} {data.schedule.uom}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-bold uppercase">Officially Received</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REMARKS (NEVER OVERWRITTEN) */}
              {activeTab === 'remarks' && (
                <div className="space-y-6">
                  {/* Historical Remarks List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Audit Trail of Historical Remarks
                    </h4>
                    {data.remarks.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                        No historical remarks recorded yet.
                      </div>
                    ) : (
                      data.remarks.map((rem) => (
                        <div key={rem.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{rem.userName}</span>
                              <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-mono">
                                {rem.role.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded uppercase">
                                {rem.category}
                              </span>
                            </div>
                            <span className="text-[10px]">{new Date(rem.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800 text-sm mt-1">{rem.remark}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Remark Form */}
                  <form onSubmit={handleAddRemark} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>Add New Historical Remark</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                        <select
                          value={remarkCategory}
                          onChange={(e) => setRemarkCategory(e.target.value as RemarkCategory)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="GENERAL">GENERAL</option>
                          <option value="SUPPLIER">SUPPLIER</option>
                          <option value="QUALITY">QUALITY</option>
                          <option value="QUANTITY">QUANTITY</option>
                          <option value="DELIVERY DELAY">DELIVERY DELAY</option>
                          <option value="SHORTAGE">SHORTAGE</option>
                          <option value="PACKING">PACKING</option>
                          <option value="DOCUMENTATION">DOCUMENTATION</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Remark Text</label>
                        <input
                          type="text"
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="e.g. Supplier confirmed dispatch via transporter..."
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingRemark || !remarkText.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Add Permanent Remark</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: SCHEDULE AUDIT HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Immutable Record of Modifications
                  </h4>
                  {data.history.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                      No schedule modifications recorded for this RM. Original planning maintained.
                    </div>
                  ) : (
                    data.history.map((his) => (
                      <div key={his.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-800">
                            Changed {his.fieldChanged} by {his.changedByName}
                          </span>
                          <span className="text-[10px]">{new Date(his.changedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] py-1">
                          <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            {String(his.oldValue)}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {String(his.newValue)}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          <strong>Reason:</strong> {his.reason}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

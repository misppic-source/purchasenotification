import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileBarChart2,
  FileDown,
  Printer,
  Filter,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';

interface ReportsViewProps {
  schedules: RMSchedule[];
  todayStr: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ schedules, todayStr }) => {
  const [reportType, setReportType] = useState<
    | 'ALL'
    | 'TODAY'
    | 'OVERDUE'
    | 'YET_TO_ARRIVE'
    | 'PARTIAL'
    | 'RECEIPTS'
    | 'REJECTED'
  >('OVERDUE');

  const [search, setSearch] = useState('');

  let filtered = schedules.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.rmCode.toLowerCase().includes(q) ||
        s.rmDescription.toLowerCase().includes(q) ||
        s.supplier.toLowerCase().includes(q) ||
        s.poNumber.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (reportType === 'TODAY') return s.plannedDate === todayStr;
    if (reportType === 'OVERDUE')
      return (s.plannedDate < todayStr && s.balanceQty > 0 && s.status !== 'CANCELLED') || s.status === 'OVERDUE';
    if (reportType === 'YET_TO_ARRIVE') return s.balanceQty > 0 && s.status !== 'CANCELLED';
    if (reportType === 'PARTIAL') return s.status === 'PARTIALLY_RECEIVED';
    if (reportType === 'REJECTED') return s.status === 'ARRIVAL_REJECTED';
    if (reportType === 'RECEIPTS') return s.receivedQty > 0;
    return true;
  });

  const totalPlanned = filtered.reduce((a, b) => a + b.plannedQty, 0);
  const totalReceived = filtered.reduce((a, b) => a + b.receivedQty, 0);
  const totalBalance = filtered.reduce((a, b) => a + b.balanceQty, 0);

  const handlePrint = () => {
    window.print();
  };

  const exportUrl = `/api/reports/export?type=${
    reportType === 'OVERDUE' ? 'overdue' : reportType === 'RECEIPTS' ? 'receipts' : 'schedules'
  }`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-indigo-600" />
            <span>Manufacturing RM Reports & Export Engine</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade reporting with live PPIC confirmed values and multi-format exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print View</span>
          </button>

          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Report Type Selector Pills */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-bold text-slate-500 uppercase text-[11px] pr-2">Report:</span>
        {[
          { id: 'OVERDUE', label: 'Overdue RM Report' },
          { id: 'TODAY', label: 'Daily Arrivals (Today)' },
          { id: 'YET_TO_ARRIVE', label: 'Yet To Arrive Master' },
          { id: 'PARTIAL', label: 'Partial Receipts' },
          { id: 'RECEIPTS', label: 'Officially Received' },
          { id: 'ALL', label: 'Complete RM Master' },
        ].map((rep) => (
          <button
            key={rep.id}
            onClick={() => setReportType(rep.id as any)}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${
              reportType === rep.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {rep.label}
          </button>
        ))}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-500">Filtered Records</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{filtered.length}</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-500">Total Planned Qty</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{totalPlanned.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-600">Total Received Qty</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{totalReceived.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-rose-600">Total Balance Qty</div>
          <div className="text-xl font-black text-rose-700 mt-0.5">{totalBalance.toLocaleString()}</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter report by RM Code, Description, Supplier, PO..."
          className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3">RM Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Planned Date</th>
                <th className="p-3 text-right">Planned Qty</th>
                <th className="p-3 text-right">Received Qty</th>
                <th className="p-3 text-right">Balance Qty</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">PO #</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-900">{s.rmCode}</td>
                  <td className="p-3 font-semibold text-slate-800">{s.rmDescription}</td>
                  <td className="p-3 font-mono">{s.plannedDate}</td>
                  <td className="p-3 text-right font-bold">{s.plannedQty.toLocaleString()} {s.uom}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">{s.receivedQty.toLocaleString()} {s.uom}</td>
                  <td className="p-3 text-right font-bold text-rose-700">{s.balanceQty.toLocaleString()} {s.uom}</td>
                  <td className="p-3 text-slate-600">{s.supplier}</td>
                  <td className="p-3 font-mono text-slate-600">{s.poNumber}</td>
                  <td className="p-3">
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No data records matching this report criterion.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

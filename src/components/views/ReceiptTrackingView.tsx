import React, { useState, useEffect } from 'react';
import { Receipt } from '../../types';
import { api } from '../../services/api';
import {
  FileCheck2,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  FileDown,
} from 'lucide-react';

export const ReceiptTrackingView: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get all receipts through schedule details or directly
    api.getSchedules().then(async (res) => {
      // Gather receipts from schedules
      const allRcp: Receipt[] = [];
      for (const sch of res.schedules.slice(0, 20)) {
        try {
          const det = await api.getScheduleDetails(sch.id);
          allRcp.push(...det.receipts);
        } catch {
          // ignore
        }
      }
      // Deduplicate by id
      const unique = Array.from(new Map(allRcp.map((r) => [r.id, r])).values());
      unique.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setReceipts(unique);
      setLoading(false);
    });
  }, []);

  const filtered = receipts.filter(
    (r) =>
      r.rmCode.toLowerCase().includes(search.toLowerCase()) ||
      r.rmDescription.toLowerCase().includes(search.toLowerCase()) ||
      r.approvedByName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalVerifiedQty = filtered.reduce((acc, r) => acc + r.approvedQty, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <span>Official Receipt Tracking (PPIC Approved)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable ledger of raw material quantities officially verified and cleared into manufacturing stock.
          </p>
        </div>

        <a
          href="/api/reports/export?type=receipts"
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
        >
          <FileDown className="w-4 h-4 text-emerald-600" />
          <span>Export Receipts (.xlsx)</span>
        </a>
      </div>

      {/* Summary Banner */}
      <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase text-emerald-800">
            Total Officially Verified Receipts
          </span>
          <div className="text-2xl font-black text-emerald-900 mt-0.5">
            {totalVerifiedQty.toLocaleString()} units
          </div>
        </div>
        <div className="text-right text-xs text-emerald-800">
          <div>{filtered.length} verified lot(s)</div>
          <div className="text-[11px] text-emerald-700">100% PPIC verified</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter receipts by RM Code, Description, Approved By..."
          className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3">Receipt ID</th>
                <th className="p-3">RM Code</th>
                <th className="p-3">Description</th>
                <th className="p-3">Actual Receipt Date</th>
                <th className="p-3 text-right">Approved Qty</th>
                <th className="p-3">Approved By (PPIC)</th>
                <th className="p-3">Verification Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-900">{r.id}</td>
                  <td className="p-3 font-mono text-slate-800 font-semibold">{r.rmCode}</td>
                  <td className="p-3 font-semibold text-slate-800">{r.rmDescription}</td>
                  <td className="p-3 font-mono">{r.receiptDate}</td>
                  <td className="p-3 text-right font-extrabold text-emerald-700">
                    +{r.approvedQty.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-slate-900">{r.approvedByName}</span>
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{r.notes || 'Full approval'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No official receipts found matching query.
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

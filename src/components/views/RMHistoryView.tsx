import React, { useState } from 'react';
import { RMSchedule } from '../../types';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';
import {
  History,
  Search,
  Calendar,
  Layers,
  FileCheck2,
  Clock,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

interface RMHistoryViewProps {
  schedules: RMSchedule[];
  onViewDetails: (s: RMSchedule) => void;
}

export const RMHistoryView: React.FC<RMHistoryViewProps> = ({
  schedules,
  onViewDetails,
}) => {
  const [selectedRmCode, setSelectedRmCode] = useState<string>(
    schedules[0]?.rmCode || '12000035'
  );
  const [search, setSearch] = useState('');

  // Extract distinct RM Codes
  const distinctRmCodes = Array.from(
    new Set(schedules.map((s) => s.rmCode))
  );

  const filteredCodes = distinctRmCodes.filter((code) => {
    const sch = schedules.find((s) => s.rmCode === code);
    if (!sch) return false;
    return (
      code.toLowerCase().includes(search.toLowerCase()) ||
      sch.rmDescription.toLowerCase().includes(search.toLowerCase())
    );
  });

  const matchingSchedules = schedules.filter((s) => s.rmCode === selectedRmCode);
  const activeMaterial = schedules.find((s) => s.rmCode === selectedRmCode);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>Raw Material Complete Lifecycle History</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Select any child material code to audit all past schedules, receipts, gate arrivals, remarks, and modifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Material Code Picker */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials..."
              className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {filteredCodes.map((code) => {
              const sch = schedules.find((s) => s.rmCode === code);
              const isSelected = selectedRmCode === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedRmCode(code)}
                  className={`w-full p-2.5 text-left rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                    isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{code}</span>
                    {sch && <StatusBadge status={sch.status} size="sm" />}
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">{sch?.rmDescription}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Comprehensive Material Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {activeMaterial && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {activeMaterial.rmCode}
                  </span>
                  <StatusBadge status={activeMaterial.status} size="sm" />
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeMaterial.rmDescription}
                </h2>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Supplier: <strong>{activeMaterial.supplier}</strong></div>
                <div>PO #: <strong>{activeMaterial.poNumber}</strong></div>
              </div>
            </div>
          )}

          {/* Schedules list for this RM */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Registered Arrival Schedules ({matchingSchedules.length})
            </h3>

            {matchingSchedules.map((s) => (
              <div
                key={s.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Planned Date: {s.plannedDate}</span>
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Schedule ID: <span className="font-mono">{s.id}</span> | Version: {s.planningVersion || 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => onViewDetails(s)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    View Complete Audit & Remarks
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Planned</span>
                    <div className="font-extrabold text-slate-900">{s.plannedQty} {s.uom}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600">Approved Received</span>
                    <div className="font-extrabold text-emerald-700">{s.receivedQty} {s.uom}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-600">Outstanding Balance</span>
                    <div className="font-extrabold text-rose-700">{s.balanceQty} {s.uom}</div>
                  </div>
                </div>

                {s.remarks && (
                  <div className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded">
                    <strong>Note:</strong> {s.remarks}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

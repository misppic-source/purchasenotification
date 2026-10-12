import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const AuditHistoryView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLogs().then((res) => {
      setLogs(res.auditLogs);
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter((l) => {
    if (entityFilter !== 'ALL' && l.entityType !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.reason && l.reason.toLowerCase().includes(q)) ||
        l.entityId.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span>Immutable System Audit Trail</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tamper-proof compliance log of all planning adjustments, gate arrivals, approval decisions, and user actions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 flex-wrap text-xs">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, reason, entity ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">All Entity Types</option>
          <option value="RM_SCHEDULE">RM Schedule</option>
          <option value="ARRIVAL_REQUEST">Arrival Request</option>
          <option value="IMPORT">Excel Import</option>
          <option value="REMARK">Remark</option>
          <option value="USER">User Account</option>
          <option value="SETTINGS">System Settings</option>
        </select>
      </div>

      {/* Audit Feed */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100 text-xs">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-indigo-700 font-semibold uppercase bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                    {log.entityType}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">{log.entityId}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="text-slate-700">
                <span>Executed by: </span>
                <strong className="text-slate-900">{log.userName}</strong>{' '}
                <span className="text-[11px] text-slate-400">({log.role.replace('_', ' ')})</span>
                {log.reason && (
                  <span className="block text-slate-600 mt-0.5 italic">
                    Reason: "{log.reason}"
                  </span>
                )}
              </div>

              {(log.oldValue || log.newValue) && (
                <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] font-mono text-slate-600 mt-1">
                  {log.oldValue && (
                    <div>Old: <span className="line-through text-rose-600">{JSON.stringify(log.oldValue)}</span></div>
                  )}
                  {log.newValue && (
                    <div>New: <span className="text-emerald-700 font-bold">{JSON.stringify(log.newValue)}</span></div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              No audit logs found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ImportPreviewItem, ImportRecord } from '../../types';
import { api } from '../../services/api';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Layers,
  FileDown,
  Trash2,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ExcelImportViewProps {
  onImportComplete: () => void;
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({ onImportComplete }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // The 2 Admin Options:
  // 'APPEND': Add more RM arrival scheduling data with old data
  // 'REPLACE': Clear old data and add new data for the new schedulings
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showDirectPurgeModal, setShowDirectPurgeModal] = useState(false);

  const [previewData, setPreviewData] = useState<{
    previewItems: ImportPreviewItem[];
    errors: { row: number; rmCode?: string; column?: string; error: string }[];
    detectedDates: string[];
    totalRowsProcessed: number;
    fileName: string;
  } | null>(null);

  const [planningVersion, setPlanningVersion] = useState(
    `v1.0-OCT-${new Date().toISOString().slice(8, 10)}`
  );
  const [importsHistory, setImportsHistory] = useState<ImportRecord[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'NEW' | 'MODIFIED' | 'UNCHANGED'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const res = await api.getImports();
      setImportsHistory(res.imports);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleModeChange = async (newMode: 'APPEND' | 'REPLACE') => {
    setImportMode(newMode);
    if (file) {
      await processFile(file, newMode);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selected = e.target.files[0];
    setFile(selected);
    await processFile(selected, importMode);
  };

  const processFile = async (f: File, mode: 'APPEND' | 'REPLACE') => {
    setIsParsing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.previewExcel(f, mode);
      setPreviewData(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse Excel file.');
      setPreviewData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleInitiateConfirm = () => {
    if (importMode === 'REPLACE') {
      setShowReplaceModal(true);
    } else {
      executeConfirmImport();
    }
  };

  const executeConfirmImport = async () => {
    if (!previewData || previewData.previewItems.length === 0) return;
    setShowReplaceModal(false);
    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const res = await api.confirmExcelImport(
        previewData.previewItems,
        previewData.fileName,
        planningVersion,
        importMode
      );

      if (importMode === 'REPLACE') {
        setSuccessMessage(
          `Old scheduling data successfully cleared! Registered ${res.importRecord.newSchedules} fresh RM schedules into the database.`
        );
      } else {
        setSuccessMessage(
          `Import applied successfully! Added ${res.importRecord.newSchedules} new schedules and updated ${res.importRecord.modifiedSchedules} existing records alongside old data.`
        );
      }

      setPreviewData(null);
      setFile(null);
      await loadHistory();
      onImportComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply import.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDirectPurge = async () => {
    setIsPurging(true);
    setErrorMessage(null);
    try {
      const res = await api.clearAllSchedules();
      setSuccessMessage(`Successfully purged all ${res.clearedCount} old schedules from the database. Clean slate ready.`);
      setShowDirectPurgeModal(false);
      onImportComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to clear schedules.');
    } finally {
      setIsPurging(false);
    }
  };

  const newCount = previewData?.previewItems.filter((i) => i.changeType === 'NEW').length || 0;
  const modCount = previewData?.previewItems.filter((i) => i.changeType === 'MODIFIED').length || 0;
  const unchangeCount = previewData?.previewItems.filter((i) => i.changeType === 'UNCHANGED').length || 0;

  const filteredPreview = previewData?.previewItems.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.changeType === filterType;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Raw Material Matrix Excel Import</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure scheduling import modes, merge ongoing schedules, or clear old data for a fresh production cycle.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowDirectPurgeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 text-xs font-semibold rounded-lg border border-rose-200 transition-colors"
            title="Purge all existing schedules"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Old Schedules</span>
          </button>

          <a
            href="/api/excel/template"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <FileDown className="w-4 h-4 text-indigo-600" />
            <span>Matrix Template</span>
          </a>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload & Preview
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Import Versions ({importsHistory.length})
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {activeTab === 'upload' ? (
        <div className="space-y-6">
          {/* THE 2 ADMIN OPTIONS CARD SELECTOR */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Select Scheduling Data Strategy
                </h2>
                <p className="text-xs text-slate-500">
                  Choose whether to keep previous schedules or wipe old data for a new cycle.
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Mode: {importMode === 'APPEND' ? 'Append & Merge' : 'Clear Old & Replace'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Option 1: Append with Old Data */}
              <div
                onClick={() => handleModeChange('APPEND')}
                className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                  importMode === 'APPEND'
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      importMode === 'APPEND' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        Option 1: Add More With Old Data
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                        Append / Merge
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      Preserves all previous raw material schedules and official receipts. New materials and dates are added alongside existing records, and identical dates update planned targets.
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-2">
                      <span>✓ Keeps current receipts</span>
                      <span>·</span>
                      <span>✓ Updates matching dates</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Clear Old Data & Add New */}
              <div
                onClick={() => handleModeChange('REPLACE')}
                className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                  importMode === 'REPLACE'
                    ? 'border-rose-600 bg-rose-50/40 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      importMode === 'REPLACE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        Option 2: Clear Old Data & Add New
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                        Clean Slate
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      Purges previous raw material scheduling records from the database. The uploaded plan becomes the sole, authoritative master schedule for the new manufacturing cycle.
                    </p>
                    <div className="text-[11px] text-rose-600 pt-1 flex items-center gap-2 font-medium">
                      <span>⚠ Purges prior schedules</span>
                      <span>·</span>
                      <span>✓ Fresh start without old clutter</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Zone (if no preview yet) */}
          {!previewData && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-all p-12 text-center shadow-xs">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Upload Planning Excel Workbook (.xlsx / .xls)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    System will parse Child / RM Code, Description, and dynamic date columns using the selected mode:
                    <strong className="text-slate-800 ml-1">
                      {importMode === 'APPEND' ? 'Add With Old Data' : 'Clear Old Data & Add New'}
                    </strong>
                  </p>
                </div>

                <div className="pt-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>{isParsing ? 'Analyzing Matrix Columns...' : 'Select Excel File'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      disabled={isParsing}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="text-[11px] text-slate-400">
                  Supported Date Formats: DD-MM-YY, DD-MM-YYYY, DD/MM/YY, YYYY-MM-DD
                </div>
              </div>
            </div>
          )}

          {/* Import Preview */}
          {previewData && (
            <div className="space-y-4">
              {/* Mode Alert Banner */}
              {importMode === 'REPLACE' ? (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Mode: Clear Old Data & Add New Schedulings Active.</strong> Upon confirmation, all existing raw material schedules currently in the database will be wiped and replaced exclusively by the {previewData.previewItems.length} items in this file.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Mode: Add More With Old Data (Append & Merge).</strong> All existing schedules and receipts are safely preserved. New items will be added alongside them.
                  </div>
                </div>
              )}

              {/* Preview Status Banner */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-indigo-600 font-mono">
                    Parsed: {previewData.fileName}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                    Import Verification & Comparison
                  </h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>
                      Detected Date Columns: <strong>{previewData.detectedDates.join(', ')}</strong>
                    </span>
                  </div>
                </div>

                {/* Planning Version Input & Action CTA */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Planning Version Tag
                    </label>
                    <input
                      type="text"
                      value={planningVersion}
                      onChange={(e) => setPlanningVersion(e.target.value)}
                      className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleInitiateConfirm}
                    disabled={isConfirming || previewData.previewItems.length === 0}
                    className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 ${
                      importMode === 'REPLACE'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isConfirming
                      ? 'Committing Changes...'
                      : importMode === 'REPLACE'
                      ? 'CLEAR OLD DATA & APPLY NEW'
                      : 'CONFIRM & MERGE IMPORT'}
                  </button>
                  <button
                    onClick={() => {
                      setPreviewData(null);
                      setFile(null);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Discard
                  </button>
                </div>
              </div>

              {/* KPI Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  onClick={() => setFilterType('NEW')}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    filterType === 'NEW'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase text-emerald-700">New Schedules</div>
                  <div className="text-xl font-black text-emerald-800 mt-0.5">{newCount}</div>
                </div>

                <div
                  onClick={() => setFilterType('MODIFIED')}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    filterType === 'MODIFIED'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase text-amber-700">Modified Qty</div>
                  <div className="text-xl font-black text-amber-800 mt-0.5">{modCount}</div>
                </div>

                <div
                  onClick={() => setFilterType('UNCHANGED')}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    filterType === 'UNCHANGED'
                      ? 'bg-slate-100 border-slate-400'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase text-slate-500">Unchanged Exact Match</div>
                  <div className="text-xl font-black text-slate-700 mt-0.5">{unchangeCount}</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold uppercase text-rose-700">Validation Errors</div>
                  <div className="text-xl font-black text-rose-800 mt-0.5">
                    {previewData.errors.length}
                  </div>
                </div>
              </div>

              {/* Major Modification Warning if any */}
              {importMode === 'APPEND' && modCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Warning:</strong> {modCount} existing RM schedule(s) have different planned quantities in this Excel file. Confirming will update the planned quantity and adjust balance according to historical rules.
                  </span>
                </div>
              )}

              {/* Validation Errors Table */}
              {previewData.errors.length > 0 && (
                <div className="bg-white rounded-xl border border-rose-200 overflow-hidden shadow-2xs">
                  <div className="p-3 bg-rose-50 border-b border-rose-200 font-bold text-rose-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Excel Row Validation Exceptions ({previewData.errors.length})</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-rose-100 text-xs">
                    {previewData.errors.map((err, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-rose-800">
                        <span>
                          Row <strong>{err.row}</strong>: {err.column ? `[${err.column}] ` : ''}
                          {err.error}
                        </span>
                        {err.rmCode && (
                          <span className="font-mono text-slate-500 font-bold">{err.rmCode}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Matrix Conversion Preview ({filteredPreview.length} items shown)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        filterType === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600'
                      }`}
                    >
                      Show All
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
                  <div className="grid grid-cols-6 p-2.5 bg-slate-100 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                    <span>RM Code</span>
                    <span className="col-span-2">Description</span>
                    <span>Date</span>
                    <span className="text-right">Qty Change</span>
                    <span className="text-center">Status</span>
                  </div>
                  {filteredPreview.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-6 p-2.5 items-center hover:bg-slate-50 text-slate-800"
                    >
                      <span className="font-mono font-bold text-slate-900">{item.rmCode}</span>
                      <span className="col-span-2 truncate pr-2">{item.rmDescription}</span>
                      <span className="font-mono">{item.date}</span>
                      <div className="text-right font-mono font-semibold">
                        {item.changeType === 'MODIFIED' ? (
                          <span>
                            <span className="line-through text-slate-400 mr-1.5">{item.oldQty}</span>
                            <span className="text-amber-700 font-bold">{item.newQty}</span>
                          </span>
                        ) : item.changeType === 'NEW' ? (
                          <span className="text-emerald-700 font-bold">+{item.newQty}</span>
                        ) : (
                          <span className="text-slate-600">{item.newQty}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            item.changeType === 'NEW'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.changeType === 'MODIFIED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.changeType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-5">
          <h3 className="text-sm font-bold text-slate-800">Historical Import Ledger</h3>
          {importsHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No previous imports recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-7 p-3 bg-slate-50 font-bold text-slate-600 uppercase text-[11px]">
                <span className="col-span-2">File Name / Version</span>
                <span>Strategy Mode</span>
                <span>Uploaded By</span>
                <span>Date & Time</span>
                <span>Changes (New / Mod)</span>
                <span className="text-right">Status</span>
              </div>
              {importsHistory.map((imp) => (
                <div key={imp.id} className="grid grid-cols-7 p-3 items-center hover:bg-slate-50">
                  <div className="col-span-2">
                    <strong className="text-slate-900 block font-mono">{imp.fileName}</strong>
                    <span className="text-[11px] text-indigo-700 font-mono">{imp.planningVersion}</span>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        imp.importMode === 'REPLACE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {imp.importMode === 'REPLACE' ? 'Clean Slate' : 'Append & Merge'}
                    </span>
                  </div>
                  <div>{imp.uploadedByName}</div>
                  <div className="text-slate-500">{new Date(imp.uploadedAt).toLocaleString()}</div>
                  <div>
                    <span className="text-emerald-700 font-bold mr-2">+{imp.newSchedules} new</span>
                    <span className="text-amber-700 font-semibold">{imp.modifiedSchedules} mod</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {imp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Replace Mode */}
      {showReplaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Database Replacement
              </h3>
              <p className="text-xs text-slate-600">
                You have selected <strong className="text-rose-700">"Clear Old Data & Add New Data"</strong>. This will purge all existing raw material schedules from the database and register <strong>{previewData?.previewItems.length}</strong> new schedules as the fresh master plan.
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <strong>Notice:</strong> This action cannot be reversed. Ensure you have verified the uploaded matrix file before proceeding.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReplaceModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmImport}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Yes, Clear Old & Import New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Direct Purge Modal */}
      {showDirectPurgeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Purge All Old Raw Material Schedules?
              </h3>
              <p className="text-xs text-slate-600">
                This will immediately clear all existing raw material schedules from the database. Use this when starting a brand new production cycle or cleaning up test data.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDirectPurgeModal(false)}
                disabled={isPurging}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectPurge}
                disabled={isPurging}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isPurging ? 'Purging...' : 'Purge All Schedules'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

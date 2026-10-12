import React, { useState, useEffect } from 'react';
import { SystemSettings } from '../../types';
import { api } from '../../services/api';
import {
  Settings,
  Clock,
  Bell,
  Play,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
} from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);

  useEffect(() => {
    api.getSettings().then((res) => {
      setSettings(res.settings);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunEvaluation = async () => {
    setIsRunningEngine(true);
    setEngineResult(null);
    try {
      const res = await api.runSchedulerEvaluation();
      setEngineResult(res.result);
    } catch (err: any) {
      alert(err.message || 'Failed to run scheduler');
    } finally {
      setIsRunningEngine(false);
    }
  };

  if (!settings) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <span>System & Background Engine Configuration</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          PPIC Admin operational settings and background scheduler controls.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>System configuration updated successfully.</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6 text-xs">
        {/* Company & Timezone */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            Company & Timezone Localization
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Entity Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Authoritative Timezone</label>
              <input
                type="text"
                value={settings.timezone}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-600 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard manufacturing timezone: Asia/Kolkata (IST).
              </span>
            </div>
          </div>
        </div>

        {/* Automated Background Notification Rules (Sections 29 & 30) */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>Automated Notification Rules (Server Scheduled Jobs)</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono">
              Runs 24/7 on Server
            </span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alert3DaysBefore}
                onChange={(e) => setSettings({ ...settings, alert3DaysBefore: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">3-Day Prior Reminder</span>
                <span className="text-slate-500 text-[11px]">
                  Alerts Purchase and PPIC 3 days prior to planned RM arrival date.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alert1DayBefore}
                onChange={(e) => setSettings({ ...settings, alert1DayBefore: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">1-Day Prior Gate Dispatch Reminder</span>
                <span className="text-slate-500 text-[11px]">
                  Reminds procurement to confirm transporter LR and gate status.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alertDueToday}
                onChange={(e) => setSettings({ ...settings, alertDueToday: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">Due Today Alert</span>
                <span className="text-slate-500 text-[11px]">
                  Triggers daily morning alert for all materials expected today.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-rose-50/50 rounded-lg border border-rose-200 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.alertDailyOverdue}
                onChange={(e) => setSettings({ ...settings, alertDailyOverdue: e.target.checked })}
                className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
              />
              <div>
                <span className="font-bold text-rose-900 block">Daily Overdue Re-Alert Engine</span>
                <span className="text-rose-700 text-[11px]">
                  Repeats overdue notifications EVERY SINGLE DAY until the outstanding balance reaches 0 or is cancelled.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Manual Trigger for Background Job (Section 58) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-600" />
            <span>Manual Background Evaluation Trigger</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test and trigger the background notification engine immediately to evaluate all active RM schedules.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={isRunningEngine}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
        >
          <span>{isRunningEngine ? 'Evaluating Schedules...' : 'Run Scheduled Job Now'}</span>
        </button>

        {engineResult && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
            <div className="font-bold text-slate-800">Job Execution Result:</div>
            <div>• Active Schedules Evaluated: <strong>{engineResult.evaluatedCount}</strong></div>
            <div>• Statuses Recalculated: <strong>{engineResult.statusUpdatedCount}</strong></div>
            <div>• New Notifications Dispatched: <strong>{engineResult.notificationsCreated}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { RMSchedule, ArrivalRequest, KPIData, AuditLog } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './components/views/LoginView';
import { PPICDashboardView } from './components/views/PPICDashboardView';
import { PurchaseDashboardView } from './components/views/PurchaseDashboardView';
import { RMCalendarView } from './components/views/RMCalendarView';
import { RMScheduleListView } from './components/views/RMScheduleListView';
import { ApprovalQueueView } from './components/views/ApprovalQueueView';
import { ExcelImportView } from './components/views/ExcelImportView';
import { ReceiptTrackingView } from './components/views/ReceiptTrackingView';
import { AIAssistantView } from './components/views/AIAssistantView';
import { ReportsView } from './components/views/ReportsView';
import { RMHistoryView } from './components/views/RMHistoryView';
import { AuditHistoryView } from './components/views/AuditHistoryView';
import { UserManagementView } from './components/views/UserManagementView';
import { SystemSettingsView } from './components/views/SystemSettingsView';
import { NotificationsView } from './components/views/NotificationsView';

import { RMDetailsModal } from './components/modals/RMDetailsModal';
import { MaterialArrivedModal } from './components/modals/MaterialArrivedModal';
import { ApprovalModal } from './components/modals/ApprovalModal';
import { EditScheduleModal } from './components/modals/EditScheduleModal';
import { CreateScheduleModal } from './components/modals/CreateScheduleModal';

export function App() {
  const { user, isAuthenticated, isLoading, isPPIC } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Keyboard shortcut: close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Master Data State
  const [schedules, setSchedules] = useState<RMSchedule[]>([]);
  const [arrivalRequests, setArrivalRequests] = useState<ArrivalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [todayStr, setTodayStr] = useState<string>('2026-10-03');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [inspectScheduleId, setInspectScheduleId] = useState<string | null>(null);
  const [arrivedSchedule, setArrivedSchedule] = useState<RMSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<RMSchedule | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<ArrivalRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Load all foundational database data
  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const [schRes, reqRes, kpiRes, audRes] = await Promise.all([
        api.getSchedules(),
        api.getArrivalRequests(),
        api.getKPIs(),
        isPPIC ? api.getAuditLogs() : Promise.resolve({ auditLogs: [] }),
      ]);
      setSchedules(schRes.schedules);
      setArrivalRequests(reqRes.arrivalRequests);
      setKpis(kpiRes.kpis);
      setTodayStr(kpiRes.todayStr || '2026-10-03');
      setAuditLogs(audRes.auditLogs);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, isPPIC]);

  useEffect(() => {
    setCurrentTab('dashboard');
    setSearchQuery('');
    setInspectScheduleId(null);
    setArrivedSchedule(null);
    setEditingSchedule(null);
    setApprovingRequest(null);
    setShowCreateModal(false);
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-mono">
        Initializing Raw Material Control Architecture...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Filter schedules by global search if active
  const displayedSchedules = schedules.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.rmCode.toLowerCase().includes(q) ||
      s.rmDescription.toLowerCase().includes(q) ||
      s.supplier.toLowerCase().includes(q) ||
      s.poNumber.toLowerCase().includes(q)
    );
  });

  const pendingRequestsCount = arrivalRequests.filter(
    (r) => r.status === 'PENDING_APPROVAL'
  ).length;

  const handleCancelSchedule = async (s: RMSchedule) => {
    const reason = prompt(`Enter mandatory cancellation reason for RM ${s.rmCode}:`);
    if (!reason || !reason.trim()) return;
    try {
      await api.cancelSchedule(s.id, reason.trim());
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel schedule');
    }
  };

  const handleApproveArrivalAction = (s: RMSchedule) => {
    const req = arrivalRequests.find(
      (r) => r.scheduleId === s.id && r.status === 'PENDING_APPROVAL'
    );
    if (req) {
      setApprovingRequest(req);
    } else {
      setInspectScheduleId(s.id);
    }
  };

  const handleResubmitRequest = (req: ArrivalRequest) => {
    const sch = schedules.find((s) => s.id === req.scheduleId);
    if (sch) {
      setArrivedSchedule(sch);
    }
  };

  // Specific filtered lists for dedicated nav tabs
  const todayList = displayedSchedules.filter(
    (s) => s.plannedDate === todayStr && s.status !== 'CANCELLED'
  );

  const todayObj = new Date(`${todayStr}T00:00:00Z`);

  const next3DaysList = displayedSchedules.filter((s) => {
    if (s.status === 'CANCELLED' || s.balanceQty <= 0) return false;
    const diff = Math.ceil(
      (new Date(`${s.plannedDate}T00:00:00Z`).getTime() - todayObj.getTime()) /
        (1000 * 3600 * 24)
    );
    return diff > 0 && diff <= 3;
  });

  const next7DaysList = displayedSchedules.filter((s) => {
    if (s.status === 'CANCELLED' || s.balanceQty <= 0) return false;
    const diff = Math.ceil(
      (new Date(`${s.plannedDate}T00:00:00Z`).getTime() - todayObj.getTime()) /
        (1000 * 3600 * 24)
    );
    return diff > 0 && diff <= 7;
  });

  const overdueList = displayedSchedules.filter(
    (s) =>
      (s.plannedDate < todayStr && s.balanceQty > 0 && s.status !== 'CANCELLED') ||
      s.status === 'OVERDUE'
  );

  const yetToArriveList = displayedSchedules.filter(
    (s) => s.balanceQty > 0 && s.status !== 'CANCELLED'
  );

  const partialList = displayedSchedules.filter((s) => s.status === 'PARTIALLY_RECEIVED');

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {/* 3-Bar Menu Controlled Drawer Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalCount={pendingRequestsCount}
        unreadNotificationCount={0}
      />

      {/* Main View Area (Expands to full screen width by default) */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          pendingApprovalsCount={pendingRequestsCount}
          onSearch={setSearchQuery}
          onOpenNotifications={() => setCurrentTab('notifications')}
          onOpenAI={() => setCurrentTab('aiAssistant')}
          onDataRefresh={loadData}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: PPIC DASHBOARD */}
          {currentTab === 'dashboard' && isPPIC && (
            <PPICDashboardView
              kpis={kpis}
              schedules={displayedSchedules}
              pendingRequests={arrivalRequests.filter((r) => r.status === 'PENDING_APPROVAL')}
              auditLogs={auditLogs}
              todayStr={todayStr}
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
              onNavigateTab={setCurrentTab}
            />
          )}

          {/* TAB 1: PURCHASE DASHBOARD */}
          {currentTab === 'dashboard' && !isPPIC && (
            <PurchaseDashboardView
              schedules={displayedSchedules}
              myArrivalRequests={arrivalRequests}
              todayStr={todayStr}
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onResubmitRequest={handleResubmitRequest}
            />
          )}

          {/* TAB 2: RM CALENDAR */}
          {currentTab === 'calendar' && (
            <RMCalendarView
              schedules={displayedSchedules}
              userRole={user!.role}
              todayStr={todayStr}
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
            />
          )}

          {/* TAB 3: RM MASTER SCHEDULE */}
          {currentTab === 'schedules' && (
            <RMScheduleListView
              schedules={displayedSchedules}
              userRole={user!.role}
              title={isPPIC ? 'Master RM Planning Schedule' : 'Purchase RM Schedules'}
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
              onCreateSchedule={() => setShowCreateModal(true)}
            />
          )}

          {/* TAB 4: TODAY'S ARRIVALS */}
          {currentTab === 'today' && (
            <RMScheduleListView
              schedules={todayList}
              userRole={user!.role}
              title={`Materials Due Today (${todayStr})`}
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
            />
          )}

          {/* TAB 5: NEXT 3 DAYS */}
          {currentTab === 'next3days' && (
            <RMScheduleListView
              schedules={next3DaysList}
              userRole={user!.role}
              title="Upcoming RM Arrivals (Next 3 Days)"
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
            />
          )}

          {/* TAB 6: NEXT 7 DAYS */}
          {currentTab === 'next7days' && (
            <RMScheduleListView
              schedules={next7DaysList}
              userRole={user!.role}
              title="Upcoming RM Arrivals (Next 7 Days)"
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
            />
          )}

          {/* TAB 7: OVERDUE RM */}
          {currentTab === 'overdue' && (
            <RMScheduleListView
              schedules={overdueList}
              userRole={user!.role}
              title="CRITICAL: Overdue Raw Materials (Daily Alert Active)"
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
            />
          )}

          {/* TAB 8: YET TO ARRIVE */}
          {currentTab === 'yetToArrive' && (
            <RMScheduleListView
              schedules={yetToArriveList}
              userRole={user!.role}
              title="Total Yet-To-Arrive Balance Master"
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
            />
          )}

          {/* TAB 9: PARTIALLY RECEIVED */}
          {currentTab === 'partialReceipts' && (
            <RMScheduleListView
              schedules={partialList}
              userRole={user!.role}
              title="Partially Received Materials (Ongoing Balance)"
              onViewDetails={(s) => setInspectScheduleId(s.id)}
              onMaterialArrived={(s) => setArrivedSchedule(s)}
              onEditSchedule={(s) => setEditingSchedule(s)}
              onCancelSchedule={handleCancelSchedule}
              onApproveArrival={handleApproveArrivalAction}
            />
          )}

          {/* TAB 10: APPROVAL QUEUE (PPIC) / ARRIVAL REQUESTS (PURCHASE) */}
          {(currentTab === 'approvalQueue' || currentTab === 'arrivalRequests') && (
            <ApprovalQueueView
              arrivalRequests={arrivalRequests}
              schedules={displayedSchedules}
              onOpenApprovalModal={(req) => setApprovingRequest(req)}
              onViewScheduleDetails={(s) => setInspectScheduleId(s.id)}
            />
          )}

          {/* TAB 11: EXCEL IMPORT */}
          {currentTab === 'excelImport' && (
            <ExcelImportView onImportComplete={loadData} />
          )}

          {/* TAB 12: RECEIPT TRACKING */}
          {currentTab === 'receiptTracking' && <ReceiptTrackingView />}

          {/* TAB 13: AI ASSISTANT */}
          {currentTab === 'aiAssistant' && <AIAssistantView />}

          {/* TAB 14: REPORTS */}
          {currentTab === 'reports' && (
            <ReportsView schedules={displayedSchedules} todayStr={todayStr} />
          )}

          {/* TAB 15: RM HISTORY */}
          {currentTab === 'rmHistory' && (
            <RMHistoryView
              schedules={displayedSchedules}
              onViewDetails={(s) => setInspectScheduleId(s.id)}
            />
          )}

          {/* TAB 16: AUDIT TRAIL */}
          {currentTab === 'auditHistory' && <AuditHistoryView />}

          {/* TAB 17: USER MANAGEMENT */}
          {currentTab === 'userManagement' && <UserManagementView />}

          {/* TAB 18: SYSTEM SETTINGS */}
          {currentTab === 'settings' && <SystemSettingsView />}

          {/* TAB 19: NOTIFICATIONS */}
          {currentTab === 'notifications' && <NotificationsView />}
        </main>
      </div>

      {/* MODAL 1: RM Details & Full Audit View */}
      <RMDetailsModal
        scheduleId={inspectScheduleId}
        onClose={() => setInspectScheduleId(null)}
        onOpenMaterialArrived={(s) => setArrivedSchedule(s)}
        userRole={user!.role}
      />

      {/* MODAL 2: Material Arrived (Purchase Submission) */}
      <MaterialArrivedModal
        schedule={arrivedSchedule}
        onClose={() => setArrivedSchedule(null)}
        onSuccess={loadData}
      />

      {/* MODAL 3: PPIC Review & Approval Modal */}
      <ApprovalModal
        request={approvingRequest}
        onClose={() => setApprovingRequest(null)}
        onSuccess={loadData}
      />

      {/* MODAL 4: PPIC Schedule Modification Modal */}
      <EditScheduleModal
        schedule={editingSchedule}
        onClose={() => setEditingSchedule(null)}
        onSuccess={loadData}
      />

      {/* MODAL 5: PPIC Create RM Schedule Modal */}
      {showCreateModal && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

export default App;

import {
  User,
  RMSchedule,
  ArrivalRequest,
  Receipt,
  RemarkRecord,
  ScheduleHistory,
  NotificationRecord,
  AuditLog,
  ImportRecord,
  ImportPreviewItem,
  SystemSettings,
  KPIData,
} from '../types';

const TOKEN_KEY = 'rm_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await res.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      errorMsg = `Server error: ${res.status} ${res.statusText}`;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: () => request<{ user: User }>('/api/auth/me'),

  // Users
  getUsers: () => request<{ users: User[] }>('/api/users'),

  createUser: (data: { name: string; email: string; password: string; role: string; department?: string }) =>
    request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setUserStatus: (id: string, active: boolean) =>
    request<{ user: User }>(`/api/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ active }),
    }),

  // Schedules
  getSchedules: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ schedules: RMSchedule[] }>(`/api/schedules${qs}`);
  },

  getScheduleDetails: (id: string) =>
    request<{
      schedule: RMSchedule;
      arrivalRequests: ArrivalRequest[];
      receipts: Receipt[];
      remarks: RemarkRecord[];
      history: ScheduleHistory[];
      auditLogs: AuditLog[];
    }>(`/api/schedules/${id}`),

  createSchedule: (data: Partial<RMSchedule>) =>
    request<{ schedule: RMSchedule }>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSchedule: (id: string, data: any) =>
    request<{ schedule: RMSchedule }>(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cancelSchedule: (id: string, cancelReason: string) =>
    request<{ schedule: RMSchedule }>(`/api/schedules/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancelReason }),
    }),

  reinstateSchedule: (id: string, reason?: string) =>
    request<{ schedule: RMSchedule }>(`/api/schedules/${id}/reinstate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Arrival Requests
  submitArrivalRequest: (data: any) =>
    request<{ arrivalRequest: ArrivalRequest }>('/api/arrival-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getArrivalRequests: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ arrivalRequests: ArrivalRequest[] }>(`/api/arrival-requests${qs}`);
  },

  approveFullArrival: (id: string, remarks?: string) =>
    request<{ arrivalRequest: ArrivalRequest; schedule: RMSchedule; receipt: Receipt }>(
      `/api/arrival-requests/${id}/approve-full`,
      {
        method: 'POST',
        body: JSON.stringify({ remarks }),
      }
    ),

  approvePartialArrival: (id: string, verifiedQty: number, remarks?: string) =>
    request<{ arrivalRequest: ArrivalRequest; schedule: RMSchedule; receipt: Receipt }>(
      `/api/arrival-requests/${id}/approve-partial`,
      {
        method: 'POST',
        body: JSON.stringify({ verifiedQty, remarks }),
      }
    ),

  rejectArrivalRequest: (id: string, rejectionReason: string, requestCorrection?: boolean) =>
    request<{ arrivalRequest: ArrivalRequest; schedule?: RMSchedule }>(
      `/api/arrival-requests/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejectionReason, requestCorrection }),
      }
    ),

  resubmitArrivalRequest: (id: string, data: any) =>
    request<{ arrivalRequest: ArrivalRequest }>(`/api/arrival-requests/${id}/resubmit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Excel
  previewExcel: async (file: File, mode: 'APPEND' | 'REPLACE' = 'APPEND') => {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append('file', file);
    if (mode) formData.append('mode', mode);

    const res = await fetch(`/api/excel/preview?mode=${mode || 'APPEND'}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to preview Excel');
    }

    return res.json() as Promise<{
      previewItems: ImportPreviewItem[];
      errors: { row: number; rmCode?: string; column?: string; error: string }[];
      detectedDates: string[];
      totalRowsProcessed: number;
      fileName: string;
    }>;
  },

  confirmExcelImport: (
    items: ImportPreviewItem[],
    fileName: string,
    planningVersion?: string,
    importMode: 'APPEND' | 'REPLACE' = 'APPEND'
  ) =>
    request<{ success: boolean; importRecord: ImportRecord }>('/api/excel/confirm', {
      method: 'POST',
      body: JSON.stringify({ items, fileName, planningVersion, importMode }),
    }),

  clearAllSchedules: () =>
    request<{ success: boolean; clearedCount: number }>('/api/schedules/clear-all', {
      method: 'POST',
    }),

  getImports: () => request<{ imports: ImportRecord[] }>('/api/excel/imports'),

  // Remarks
  getRemarks: (scheduleId?: string, rmCode?: string) => {
    const params = new URLSearchParams();
    if (scheduleId) params.append('scheduleId', scheduleId);
    if (rmCode) params.append('rmCode', rmCode);
    return request<{ remarks: RemarkRecord[] }>(`/api/remarks?${params.toString()}`);
  },

  addRemark: (data: { scheduleId: string; rmCode: string; category: string; remark: string }) =>
    request<{ remark: RemarkRecord }>('/api/remarks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationRecord[] }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),

  runSchedulerEvaluation: () =>
    request<{ success: boolean; result: any }>('/api/notifications/run-evaluation', {
      method: 'POST',
    }),

  // Audit Logs & Settings
  getAuditLogs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ auditLogs: AuditLog[] }>(`/api/audit-logs${qs}`);
  },

  getSettings: () => request<{ settings: SystemSettings }>('/api/settings'),

  updateSettings: (settings: Partial<SystemSettings>) =>
    request<{ settings: SystemSettings }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Reports
  getKPIs: () => request<{ kpis: KPIData; todayStr: string }>('/api/reports/kpis'),

  // AI Assistant
  askAI: (question: string) =>
    request<{ answer: string; matchedRecords?: any[] }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),

  getAIDailySummary: () =>
    request<{ summary: string; generatedAt: string }>('/api/ai/daily-summary'),
};

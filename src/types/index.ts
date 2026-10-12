export type UserRole = 'PPIC_ADMIN' | 'PURCHASE_TEAM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
  updatedAt: string;
}

export type ScheduleStatus =
  | 'SCHEDULED'
  | 'DUE_SOON'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'ARRIVAL_PENDING_APPROVAL'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'ARRIVAL_REJECTED'
  | 'CANCELLED';

export interface RMSchedule {
  id: string;
  rmCode: string;
  rmDescription: string;
  plannedDate: string; // YYYY-MM-DD
  plannedQty: number;
  receivedQty: number; // PPIC Approved ONLY
  balanceQty: number; // plannedQty - receivedQty
  uom: string;
  supplier: string;
  poNumber: string;
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: ScheduleStatus;
  remarks?: string;
  sourceFile?: string;
  planningVersion?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export type ArrivalRequestStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED';

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  dataUrl?: string;
}

export interface ArrivalRequest {
  id: string;
  scheduleId: string;
  rmCode: string;
  rmDescription: string;
  plannedDate: string;
  plannedQty: number;
  currentApprovedQty: number;
  currentBalanceQty: number;
  actualArrivalDate: string;
  reportedQty: number;
  remarks: string;
  supplier: string;
  poNumber: string;
  deliveryChallan?: string;
  invoiceNumber?: string;
  grnNumber?: string;
  transportDoc?: string;
  attachments: DocumentAttachment[];
  purchaseUserId: string;
  purchaseUserName: string;
  submittedAt: string;
  status: ArrivalRequestStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  approvedQty?: number;
  reviewerRemarks?: string;
  rejectionReason?: string;
  correctionRequested?: boolean;
}

export interface Receipt {
  id: string;
  scheduleId: string;
  arrivalRequestId: string;
  rmCode: string;
  rmDescription: string;
  approvedQty: number;
  receiptDate: string;
  approvedBy: string;
  approvedByName: string;
  notes?: string;
  createdAt: string;
}

export type RemarkCategory =
  | 'GENERAL'
  | 'SUPPLIER'
  | 'QUALITY'
  | 'QUANTITY'
  | 'DELIVERY DELAY'
  | 'SHORTAGE'
  | 'PACKING'
  | 'DOCUMENTATION'
  | 'OTHER';

export interface RemarkRecord {
  id: string;
  scheduleId: string;
  rmCode: string;
  category: RemarkCategory;
  remark: string;
  userId: string;
  userName: string;
  role: UserRole;
  createdAt: string;
}

export interface ScheduleHistory {
  id: string;
  scheduleId: string;
  rmCode: string;
  fieldChanged: string;
  oldValue: any;
  newValue: any;
  reason: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

export interface NotificationRecord {
  id: string;
  type:
    | 'REMINDER_3_DAYS'
    | 'REMINDER_1_DAY'
    | 'DUE_TODAY'
    | 'OVERDUE'
    | 'PARTIAL_RECEIPT'
    | 'ARRIVAL_REQUEST_SUBMITTED'
    | 'ARRIVAL_APPROVED'
    | 'ARRIVAL_PARTIALLY_APPROVED'
    | 'ARRIVAL_REJECTED'
    | 'SCHEDULE_MODIFIED'
    | 'SCHEDULE_CANCELLED'
    | 'SCHEDULE_REINSTATED';
  title: string;
  message: string;
  targetRole: 'ALL' | 'PPIC_ADMIN' | 'PURCHASE_TEAM';
  targetUserId?: string;
  scheduleId?: string;
  rmCode?: string;
  readBy: string[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
}

export interface ImportPreviewItem {
  id?: string;
  rmCode: string;
  rmDescription: string;
  date: string;
  oldQty?: number;
  newQty: number;
  changeType: 'NEW' | 'MODIFIED' | 'UNCHANGED' | 'REMOVED_CANDIDATE' | 'INVALID';
  notes?: string;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  totalRows: number;
  newSchedules: number;
  modifiedSchedules: number;
  unchangedSchedules: number;
  cancelledCandidates: number;
  errorCount: number;
  status: 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  planningVersion: string;
  importMode?: 'APPEND' | 'REPLACE';
}

export interface SystemSettings {
  companyName: string;
  timezone: string;
  alert3DaysBefore: boolean;
  alert1DayBefore: boolean;
  alertDueToday: boolean;
  alertDailyOverdue: boolean;
  notificationHourIST: number;
  defaultUom: string;
  allowOverReceipt: boolean;
  lastDailyRun?: string;
}

export interface KPIData {
  totalArrivals: number;
  totalPlannedQty: number;
  totalReceivedQty: number;
  totalBalanceQty: number;
  pendingApprovalCount: number;
  pendingApprovalQty: number;
  dueTodayCount: number;
  next3DaysCount: number;
  next7DaysCount: number;
  overdueCount: number;
  partiallyReceivedCount: number;
  cancelledCount: number;
}

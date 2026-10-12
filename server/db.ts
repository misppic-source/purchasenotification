import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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
  SystemSettings,
  ScheduleStatus,
} from './types';

interface DatabaseSchema {
  users: User[];
  schedules: RMSchedule[];
  arrivalRequests: ArrivalRequest[];
  receipts: Receipt[];
  remarks: RemarkRecord[];
  scheduleHistory: ScheduleHistory[];
  notifications: NotificationRecord[];
  notificationLogs: string[];
  imports: ImportRecord[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'rm_database.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let memoryDb: DatabaseSchema | null = null;

function getInitialSeedData(): DatabaseSchema {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      'Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters before first startup.'
    );
  }

  const now = new Date().toISOString();
  const admin: User = {
    id: 'USR-PPIC-01',
    name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'System Administrator',
    email,
    passwordHash: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
    role: 'PPIC_ADMIN',
    department: 'Planning & Operations',
    active: true,
    createdAt: now,
    createdBy: 'SYSTEM_BOOTSTRAP',
    updatedAt: now,
  };

  return {
    users: [admin],
    schedules: [],
    arrivalRequests: [],
    receipts: [],
    remarks: [],
    scheduleHistory: [],
    notifications: [],
    notificationLogs: [],
    imports: [],
    auditLogs: [],
    settings: {
      companyName: 'Raw Material Operations',
      timezone: 'Asia/Kolkata',
      alert3DaysBefore: true,
      alert1DayBefore: true,
      alertDueToday: true,
      alertDailyOverdue: true,
      notificationHourIST: 8,
      defaultUom: 'KG',
      allowOverReceipt: false,
      lastDailyRun: '',
    },
  };
}

export function getDatabase(): DatabaseSchema {
  if (memoryDb) return memoryDb;

  if (fs.existsSync(DB_FILE)) {
    try {
      memoryDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
      return memoryDb;
    } catch (err) {
      console.error('Failed reading DB file, initializing a fresh database:', err);
    }
  }

  const initial = getInitialSeedData();
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    const serialized = JSON.stringify(data, null, 2);
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, serialized, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    memoryDb = data;
  } catch (err) {
    console.error('Failed writing DB file:', err);
    throw err;
  }
}

export function getUsers(): User[] {
  return getDatabase().users;
}

export function getUserById(id: string): User | undefined {
  return getDatabase().users.find((user) => user.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return getDatabase().users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function createUser(user: User): User {
  const db = getDatabase();
  db.users.push(user);
  saveDatabase(db);
  return user;
}

export function updateUser(id: string, updates: Partial<User>): User | undefined {
  const db = getDatabase();
  const index = db.users.findIndex((user) => user.id === id);
  if (index === -1) return undefined;
  db.users[index] = { ...db.users[index], ...updates, updatedAt: new Date().toISOString() };
  saveDatabase(db);
  return db.users[index];
}

export function getSchedules(): RMSchedule[] {
  return getDatabase().schedules;
}

export function getScheduleById(id: string): RMSchedule | undefined {
  return getDatabase().schedules.find((schedule) => schedule.id === id);
}

export function saveSchedule(schedule: RMSchedule): RMSchedule {
  const db = getDatabase();
  const index = db.schedules.findIndex((item) => item.id === schedule.id);
  if (index >= 0) db.schedules[index] = schedule;
  else db.schedules.push(schedule);
  saveDatabase(db);
  return schedule;
}

export function clearAllSchedules(): number {
  const db = getDatabase();
  const count = db.schedules.length;
  db.schedules = [];
  db.arrivalRequests = db.arrivalRequests.filter(
    (request) => request.status === 'APPROVED' || request.status === 'PARTIALLY_APPROVED'
  );
  db.notificationLogs = [];
  saveDatabase(db);
  return count;
}

export function replaceSchedules(newSchedules: RMSchedule[]): void {
  const db = getDatabase();
  db.schedules = newSchedules;
  db.arrivalRequests = db.arrivalRequests.filter(
    (request) => request.status === 'APPROVED' || request.status === 'PARTIALLY_APPROVED'
  );
  db.notificationLogs = [];
  saveDatabase(db);
}

export function getArrivalRequests(): ArrivalRequest[] {
  return getDatabase().arrivalRequests;
}

export function getArrivalRequestById(id: string): ArrivalRequest | undefined {
  return getDatabase().arrivalRequests.find((request) => request.id === id);
}

export function saveArrivalRequest(request: ArrivalRequest): ArrivalRequest {
  const db = getDatabase();
  const index = db.arrivalRequests.findIndex((item) => item.id === request.id);
  if (index >= 0) db.arrivalRequests[index] = request;
  else db.arrivalRequests.push(request);
  saveDatabase(db);
  return request;
}

export function getReceipts(): Receipt[] {
  return getDatabase().receipts;
}

export function addReceipt(receipt: Receipt): Receipt {
  const db = getDatabase();
  db.receipts.push(receipt);
  saveDatabase(db);
  return receipt;
}

export function getRemarks(scheduleId?: string, rmCode?: string): RemarkRecord[] {
  return getDatabase().remarks.filter(
    (remark) =>
      (!scheduleId || remark.scheduleId === scheduleId) &&
      (!rmCode || remark.rmCode === rmCode)
  );
}

export function addRemark(remark: RemarkRecord): RemarkRecord {
  const db = getDatabase();
  db.remarks.push(remark);
  saveDatabase(db);
  return remark;
}

export function getScheduleHistory(scheduleId?: string, rmCode?: string): ScheduleHistory[] {
  return getDatabase().scheduleHistory.filter(
    (entry) =>
      (!scheduleId || entry.scheduleId === scheduleId) &&
      (!rmCode || entry.rmCode === rmCode)
  );
}

export function addScheduleHistory(entry: ScheduleHistory): ScheduleHistory {
  const db = getDatabase();
  db.scheduleHistory.push(entry);
  saveDatabase(db);
  return entry;
}

export function getNotifications(): NotificationRecord[] {
  return getDatabase().notifications;
}

export function addNotification(notification: NotificationRecord): NotificationRecord {
  const db = getDatabase();
  db.notifications.unshift(notification);
  saveDatabase(db);
  return notification;
}

export function markNotificationAsRead(id: string, userId: string): boolean {
  const db = getDatabase();
  const notification = db.notifications.find((item) => item.id === id);
  if (!notification || notification.readBy.includes(userId)) return false;
  notification.readBy.push(userId);
  saveDatabase(db);
  return true;
}

export function hasNotificationBeenSent(key: string): boolean {
  return getDatabase().notificationLogs.includes(key);
}

export function recordNotificationLog(key: string): void {
  const db = getDatabase();
  if (db.notificationLogs.includes(key)) return;
  db.notificationLogs.push(key);
  saveDatabase(db);
}

export function getAuditLogs(): AuditLog[] {
  return getDatabase().auditLogs;
}

export function addAuditLog(log: AuditLog): AuditLog {
  const db = getDatabase();
  db.auditLogs.unshift(log);
  saveDatabase(db);
  return log;
}

export function getImports(): ImportRecord[] {
  return getDatabase().imports;
}

export function addImport(record: ImportRecord): ImportRecord {
  const db = getDatabase();
  db.imports.unshift(record);
  saveDatabase(db);
  return record;
}

export function getSettings(): SystemSettings {
  return getDatabase().settings;
}

export function updateSettings(settings: Partial<SystemSettings>): SystemSettings {
  const db = getDatabase();
  db.settings = { ...db.settings, ...settings };
  saveDatabase(db);
  return db.settings;
}

export function computeScheduleStatus(
  schedule: RMSchedule,
  todayStr: string,
  hasPendingArrival: boolean
): ScheduleStatus {
  if (schedule.status === 'CANCELLED') return 'CANCELLED';
  if (schedule.receivedQty >= schedule.plannedQty && schedule.plannedQty > 0) return 'RECEIVED';
  if (hasPendingArrival) return 'ARRIVAL_PENDING_APPROVAL';
  if (schedule.receivedQty > 0 && schedule.balanceQty > 0) return 'PARTIALLY_RECEIVED';
  if (schedule.plannedDate < todayStr && schedule.balanceQty > 0) return 'OVERDUE';
  if (schedule.plannedDate === todayStr && schedule.balanceQty > 0) return 'DUE_TODAY';

  const today = new Date(todayStr);
  const target = new Date(schedule.plannedDate);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffDays > 0 && diffDays <= 3 && schedule.balanceQty > 0) return 'DUE_SOON';
  return 'SCHEDULED';
}

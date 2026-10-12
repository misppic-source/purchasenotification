import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config();

import {
  getDatabase,
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  getSchedules,
  getScheduleById,
  saveSchedule,
  clearAllSchedules,
  getArrivalRequests,
  getArrivalRequestById,
  saveArrivalRequest,
  getReceipts,
  addReceipt,
  getRemarks,
  addRemark,
  getScheduleHistory,
  addScheduleHistory,
  getNotifications,
  addNotification,
  markNotificationAsRead,
  getAuditLogs,
  addAuditLog,
  getImports,
  addImport,
  getSettings,
  updateSettings,
  computeScheduleStatus,
} from './server/db';
import {
  getKolkataDateString,
  startBackgroundScheduler,
  evaluateSchedulesAndNotify,
} from './server/scheduler';
import { parseRMPlanningExcel } from './server/excel';
import { askAIAssistant, generateDailySummary } from './server/ai';
import {
  User,
  UserRole,
  RMSchedule,
  ArrivalRequest,
  Receipt,
  RemarkRecord,
  AuditLog,
} from './server/types';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Set JWT_SECRET to a random value of at least 32 characters before startup.');
  }
  return secret;
})();

// Middleware for JSON & urlencoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup multer for memory storage uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// -------------------------------------------------------------
// Authentication & Security Middleware
// -------------------------------------------------------------

interface AuthenticatedRequest extends Request {
  user?: User;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (
      typeof payload === 'string' ||
      typeof payload.id !== 'string' ||
      (payload.role !== 'PPIC_ADMIN' && payload.role !== 'PURCHASE_TEAM')
    ) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    const user = getUserById(payload.id);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User account is inactive or not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

function requirePPIC(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'PPIC_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: PPIC Admin authority required.' });
  }
  next();
}

// -------------------------------------------------------------
// Auth Routes
// -------------------------------------------------------------

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'This account has been deactivated. Please contact PPIC Admin.' });
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Update last login
  updateUser(user.id, { lastLogin: new Date().toISOString() });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
    reason: 'User logged in successfully',
    ipAddress: req.ip,
  });

  const { passwordHash, ...userProfile } = user;
  res.json({ token, user: userProfile });
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash, ...profile } = req.user;
  res.json({ user: profile });
});

// -------------------------------------------------------------
// User Management Routes (PPIC Admin Only)
// -------------------------------------------------------------

app.get('/api/users', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const users = getUsers().map(({ passwordHash, ...u }) => u);
  res.json({ users });
});

app.post('/api/users', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  if (getUserByEmail(email)) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: `USR-${Date.now()}`,
    name,
    email,
    passwordHash,
    role,
    department: department || (role === 'PPIC_ADMIN' ? 'PPIC Planning' : 'Procurement Team'),
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: req.user!.id,
    updatedAt: new Date().toISOString(),
  };

  createUser(newUser);

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'CREATE_USER',
    entityType: 'USER',
    entityId: newUser.id,
    newValue: { name, email, role, department },
    reason: 'PPIC Admin created user account',
  });

  const { passwordHash: _, ...created } = newUser;
  res.status(201).json({ user: created });
});

app.put('/api/users/:id/status', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const { active } = req.body;
  const targetId = req.params.id;

  if (targetId === req.user!.id) {
    return res.status(400).json({ error: 'Cannot deactivate your own PPIC Admin account.' });
  }

  const updated = updateUser(targetId, { active: Boolean(active) });
  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    entityType: 'USER',
    entityId: targetId,
    reason: `User ${active ? 'activated' : 'deactivated'} by PPIC Admin`,
  });

  const { passwordHash: _, ...profile } = updated;
  res.json({ user: profile });
});

// -------------------------------------------------------------
// RM Schedules Routes
// -------------------------------------------------------------

app.get('/api/schedules', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { status, rmCode, supplier, dateFrom, dateTo, search } = req.query;
  let schedules = getSchedules();

  if (status && typeof status === 'string' && status !== 'ALL') {
    schedules = schedules.filter((s) => s.status === status);
  }

  if (rmCode && typeof rmCode === 'string') {
    schedules = schedules.filter((s) => s.rmCode.toLowerCase().includes(rmCode.toLowerCase()));
  }

  if (supplier && typeof supplier === 'string') {
    schedules = schedules.filter((s) => s.supplier.toLowerCase().includes(supplier.toLowerCase()));
  }

  if (dateFrom && typeof dateFrom === 'string') {
    schedules = schedules.filter((s) => s.plannedDate >= dateFrom);
  }

  if (dateTo && typeof dateTo === 'string') {
    schedules = schedules.filter((s) => s.plannedDate <= dateTo);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    schedules = schedules.filter(
      (s) =>
        s.rmCode.toLowerCase().includes(q) ||
        s.rmDescription.toLowerCase().includes(q) ||
        s.supplier.toLowerCase().includes(q) ||
        s.poNumber.toLowerCase().includes(q) ||
        (s.remarks && s.remarks.toLowerCase().includes(q))
    );
  }

  // Sort by plannedDate ascending
  schedules.sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
  res.json({ schedules });
});

app.get('/api/schedules/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const schedule = getScheduleById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'RM Schedule not found.' });
  }

  const arrivalRequests = getArrivalRequests().filter((r) => r.scheduleId === schedule.id);
  const receipts = getReceipts().filter((rcp) => rcp.scheduleId === schedule.id);
  const remarks = getRemarks(schedule.id);
  const history = getScheduleHistory(schedule.id);
  const auditLogs = getAuditLogs().filter(
    (l) => l.entityId === schedule.id || (l.newValue && l.newValue.rmCode === schedule.rmCode)
  );

  res.json({
    schedule,
    arrivalRequests,
    receipts,
    remarks,
    history,
    auditLogs,
  });
});

app.post('/api/schedules', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const { rmCode, rmDescription, plannedDate, plannedQty, uom, supplier, poNumber, priority, remarks } = req.body;

  if (!rmCode || !rmDescription || !plannedDate || plannedQty == null) {
    return res.status(400).json({ error: 'RM Code, Description, Planned Date, and Planned Quantity are required.' });
  }

  const qty = Number(plannedQty);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Planned Quantity must be greater than zero.' });
  }

  const todayStr = getKolkataDateString();
  const id = `SCH-${plannedDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newSchedule: RMSchedule = {
    id,
    rmCode: String(rmCode).trim(),
    rmDescription: String(rmDescription).trim(),
    plannedDate,
    plannedQty: qty,
    receivedQty: 0,
    balanceQty: qty,
    uom: uom || 'KG',
    supplier: supplier || 'TBD',
    poNumber: poNumber || 'TBD',
    priority: priority || 'NORMAL',
    status: plannedDate === todayStr ? 'DUE_TODAY' : plannedDate < todayStr ? 'OVERDUE' : 'SCHEDULED',
    remarks: remarks || '',
    planningVersion: 'MANUAL_ENTRY',
    createdBy: req.user!.id,
    createdAt: new Date().toISOString(),
    updatedBy: req.user!.id,
    updatedAt: new Date().toISOString(),
  };

  saveSchedule(newSchedule);

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'CREATE_SCHEDULE',
    entityType: 'RM_SCHEDULE',
    entityId: id,
    newValue: newSchedule,
    reason: 'Manual RM schedule created by PPIC Admin',
  });

  res.status(201).json({ schedule: newSchedule });
});

// Modify Planned Date or Planned Quantity (PPIC ONLY!)
app.put('/api/schedules/:id', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const schedule = getScheduleById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'RM Schedule not found.' });
  }

  const { plannedDate, plannedQty, priority, supplier, poNumber, remarks, changeReason } = req.body;
  const todayStr = getKolkataDateString();

  if (!changeReason) {
    return res.status(400).json({ error: 'Reason for schedule modification is mandatory for audit compliance.' });
  }

  const changes: { field: string; oldVal: any; newVal: any }[] = [];

  if (plannedDate && plannedDate !== schedule.plannedDate) {
    changes.push({ field: 'plannedDate', oldVal: schedule.plannedDate, newVal: plannedDate });
    schedule.plannedDate = plannedDate;
  }

  if (plannedQty != null && Number(plannedQty) !== schedule.plannedQty) {
    const newQty = Number(plannedQty);
    if (newQty < schedule.receivedQty) {
      return res.status(400).json({
        error: `New planned quantity (${newQty}) cannot be less than already approved received quantity (${schedule.receivedQty}).`,
      });
    }
    changes.push({ field: 'plannedQty', oldVal: schedule.plannedQty, newVal: newQty });
    schedule.plannedQty = newQty;
    schedule.balanceQty = newQty - schedule.receivedQty;
  }

  if (priority && priority !== schedule.priority) {
    changes.push({ field: 'priority', oldVal: schedule.priority, newVal: priority });
    schedule.priority = priority;
  }

  if (supplier !== undefined) schedule.supplier = supplier;
  if (poNumber !== undefined) schedule.poNumber = poNumber;
  if (remarks !== undefined) schedule.remarks = remarks;

  schedule.updatedBy = req.user!.id;
  schedule.updatedAt = new Date().toISOString();

  // Recalculate status
  const hasPending = getArrivalRequests().some(
    (r) => r.scheduleId === schedule.id && r.status === 'PENDING_APPROVAL'
  );
  schedule.status = computeScheduleStatus(schedule, todayStr, hasPending);

  saveSchedule(schedule);

  // Preserve history for each field changed
  for (const c of changes) {
    addScheduleHistory({
      id: `HIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      scheduleId: schedule.id,
      rmCode: schedule.rmCode,
      fieldChanged: c.field,
      oldValue: c.oldVal,
      newValue: c.newVal,
      reason: changeReason,
      changedBy: req.user!.id,
      changedByName: req.user!.name,
      changedAt: new Date().toISOString(),
    });
  }

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'MODIFY_SCHEDULE',
    entityType: 'RM_SCHEDULE',
    entityId: schedule.id,
    oldValue: changes.map((c) => ({ [c.field]: c.oldVal })),
    newValue: changes.map((c) => ({ [c.field]: c.newVal })),
    reason: changeReason,
  });

  // Notify Purchase team of the change
  addNotification({
    id: `NOTIF-${Date.now()}`,
    type: 'SCHEDULE_MODIFIED',
    title: `RM Schedule Modified — ${schedule.rmCode}`,
    message: `PPIC modified RM ${schedule.rmCode} schedule. Planned Date: ${schedule.plannedDate}, Qty: ${schedule.plannedQty} ${schedule.uom}. Reason: ${changeReason}`,
    targetRole: 'PURCHASE_TEAM',
    scheduleId: schedule.id,
    rmCode: schedule.rmCode,
    readBy: [],
    createdAt: new Date().toISOString(),
  });

  res.json({ schedule });
});

// Cancel Schedule (PPIC ONLY!)
app.post('/api/schedules/:id/cancel', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const schedule = getScheduleById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'RM Schedule not found.' });
  }

  const { cancelReason } = req.body;
  if (!cancelReason) {
    return res.status(400).json({ error: 'Cancellation reason is required.' });
  }

  const oldStatus = schedule.status;
  schedule.status = 'CANCELLED';
  schedule.cancelledBy = req.user!.id;
  schedule.cancelledAt = new Date().toISOString();
  schedule.cancelReason = cancelReason;
  schedule.updatedBy = req.user!.id;
  schedule.updatedAt = new Date().toISOString();

  saveSchedule(schedule);

  addScheduleHistory({
    id: `HIS-${Date.now()}`,
    scheduleId: schedule.id,
    rmCode: schedule.rmCode,
    fieldChanged: 'status',
    oldValue: oldStatus,
    newValue: 'CANCELLED',
    reason: cancelReason,
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    changedAt: new Date().toISOString(),
  });

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'CANCEL_SCHEDULE',
    entityType: 'RM_SCHEDULE',
    entityId: schedule.id,
    reason: cancelReason,
  });

  addNotification({
    id: `NOTIF-${Date.now()}`,
    type: 'SCHEDULE_CANCELLED',
    title: `RM Schedule Cancelled — ${schedule.rmCode}`,
    message: `RM ${schedule.rmCode} planned for ${schedule.plannedDate} has been cancelled by PPIC. Reason: ${cancelReason}`,
    targetRole: 'ALL',
    scheduleId: schedule.id,
    rmCode: schedule.rmCode,
    readBy: [],
    createdAt: new Date().toISOString(),
  });

  res.json({ schedule });
});

// Reinstate Schedule (PPIC ONLY!)
app.post('/api/schedules/:id/reinstate', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const schedule = getScheduleById(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: 'RM Schedule not found.' });
  }

  if (schedule.status !== 'CANCELLED') {
    return res.status(400).json({ error: 'Schedule is not cancelled.' });
  }

  const { reason } = req.body;
  const todayStr = getKolkataDateString();
  schedule.cancelledBy = undefined;
  schedule.cancelledAt = undefined;
  schedule.cancelReason = undefined;
  schedule.updatedBy = req.user!.id;
  schedule.updatedAt = new Date().toISOString();

  const hasPending = getArrivalRequests().some(
    (r) => r.scheduleId === schedule.id && r.status === 'PENDING_APPROVAL'
  );
  schedule.status = computeScheduleStatus(schedule, todayStr, hasPending);

  saveSchedule(schedule);

  addScheduleHistory({
    id: `HIS-${Date.now()}`,
    scheduleId: schedule.id,
    rmCode: schedule.rmCode,
    fieldChanged: 'status',
    oldValue: 'CANCELLED',
    newValue: schedule.status,
    reason: reason || 'Reinstated by PPIC Admin',
    changedBy: req.user!.id,
    changedByName: req.user!.name,
    changedAt: new Date().toISOString(),
  });

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'REINSTATE_SCHEDULE',
    entityType: 'RM_SCHEDULE',
    entityId: schedule.id,
    reason: reason || 'Reinstated by PPIC Admin',
  });

  res.json({ schedule });
});

// Admin Clear All Schedules (Purge old schedules for fresh scheduling)
app.post('/api/schedules/clear-all', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const count = clearAllSchedules();

  addAuditLog({
    id: `AUD-${Date.now()}-PURGE`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'CLEAR_OLD_SCHEDULES',
    entityType: 'RM_SCHEDULE',
    entityId: 'ALL_SCHEDULES',
    reason: `PPIC Admin initiated manual purge of all ${count} old scheduling records`,
  });

  evaluateSchedulesAndNotify();
  res.json({ success: true, clearedCount: count });
});

// -------------------------------------------------------------
// Arrival Request Workflow
// -------------------------------------------------------------

// Purchase Reports Material Arrival
app.post('/api/arrival-requests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const {
    scheduleId,
    actualArrivalDate,
    reportedQty,
    remarks,
    supplier,
    poNumber,
    deliveryChallan,
    invoiceNumber,
    grnNumber,
    transportDoc,
    attachments,
  } = req.body;

  if (!scheduleId || !actualArrivalDate || reportedQty == null) {
    return res.status(400).json({ error: 'Schedule ID, Actual Arrival Date, and Reported Quantity are required.' });
  }

  const qty = Number(reportedQty);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Reported quantity must be a positive number.' });
  }

  const schedule = getScheduleById(scheduleId);
  if (!schedule) {
    return res.status(404).json({ error: 'RM Schedule not found.' });
  }

  if (schedule.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot report arrival for a cancelled schedule.' });
  }

  const todayStr = getKolkataDateString();
  const dateFormatted = todayStr.replace(/-/g, '');
  const id = `ARR-${dateFormatted}-${Math.floor(1000 + Math.random() * 9000)}`;

  const arrivalReq: ArrivalRequest = {
    id,
    scheduleId: schedule.id,
    rmCode: schedule.rmCode,
    rmDescription: schedule.rmDescription,
    plannedDate: schedule.plannedDate,
    plannedQty: schedule.plannedQty,
    currentApprovedQty: schedule.receivedQty,
    currentBalanceQty: schedule.balanceQty,
    actualArrivalDate,
    reportedQty: qty,
    remarks: remarks || '',
    supplier: supplier || schedule.supplier,
    poNumber: poNumber || schedule.poNumber,
    deliveryChallan: deliveryChallan || '',
    invoiceNumber: invoiceNumber || '',
    grnNumber: grnNumber || '',
    transportDoc: transportDoc || '',
    attachments: attachments || [],
    purchaseUserId: req.user!.id,
    purchaseUserName: req.user!.name,
    submittedAt: new Date().toISOString(),
    status: 'PENDING_APPROVAL',
  };

  saveArrivalRequest(arrivalReq);

  // Update schedule status to ARRIVAL_PENDING_APPROVAL
  // CRITICAL RULE: Official receivedQty is NOT modified here!
  schedule.status = 'ARRIVAL_PENDING_APPROVAL';
  schedule.updatedBy = req.user!.id;
  schedule.updatedAt = new Date().toISOString();
  saveSchedule(schedule);

  // Audit log
  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'SUBMIT_ARRIVAL_REQUEST',
    entityType: 'ARRIVAL_REQUEST',
    entityId: id,
    newValue: {
      rmCode: schedule.rmCode,
      reportedQty: qty,
      actualArrivalDate,
      deliveryChallan,
    },
    reason: 'Purchase submitted material arrival confirmation awaiting PPIC verification',
  });

  // Notify PPIC Admin
  addNotification({
    id: `NOTIF-${Date.now()}`,
    type: 'ARRIVAL_REQUEST_SUBMITTED',
    title: `Arrival Verification Required — RM ${schedule.rmCode}`,
    message: `${req.user!.name} (Purchase) reported arrival of ${qty} ${schedule.uom} for RM ${schedule.rmCode}. Please review and approve in Approval Queue.`,
    targetRole: 'PPIC_ADMIN',
    scheduleId: schedule.id,
    rmCode: schedule.rmCode,
    readBy: [],
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ arrivalRequest: arrivalReq });
});

app.get('/api/arrival-requests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { status, scheduleId, rmCode } = req.query;
  let list = getArrivalRequests();

  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  if (scheduleId && typeof scheduleId === 'string') {
    list = list.filter((r) => r.scheduleId === scheduleId);
  }

  if (rmCode && typeof rmCode === 'string') {
    list = list.filter((r) => r.rmCode.toLowerCase().includes(rmCode.toLowerCase()));
  }

  // Sort newest first
  list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  res.json({ arrivalRequests: list });
});

// PPIC Approve Full Arrival
app.post(
  '/api/arrival-requests/:id/approve-full',
  authenticateToken,
  requirePPIC,
  (req: AuthenticatedRequest, res: Response) => {
    const arrivalReq = getArrivalRequestById(req.params.id);
    if (!arrivalReq) {
      return res.status(404).json({ error: 'Arrival Request not found.' });
    }

    if (arrivalReq.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: `Request is already in ${arrivalReq.status} status.` });
    }

    const schedule = getScheduleById(arrivalReq.scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Associated RM Schedule not found.' });
    }

    const { remarks } = req.body;
    const approvedQty = arrivalReq.reportedQty;
    const todayStr = getKolkataDateString();

    // Update arrival request
    arrivalReq.status = 'APPROVED';
    arrivalReq.approvedQty = approvedQty;
    arrivalReq.reviewedAt = new Date().toISOString();
    arrivalReq.reviewedBy = req.user!.id;
    arrivalReq.reviewedByName = req.user!.name;
    arrivalReq.reviewerRemarks = remarks || 'Approved in full by PPIC.';
    saveArrivalRequest(arrivalReq);

    // Update schedule official received quantity
    const oldReceived = schedule.receivedQty;
    const oldBalance = schedule.balanceQty;
    schedule.receivedQty = oldReceived + approvedQty;
    schedule.balanceQty = Math.max(0, schedule.plannedQty - schedule.receivedQty);
    schedule.updatedBy = req.user!.id;
    schedule.updatedAt = new Date().toISOString();

    // Check if fully received
    if (schedule.receivedQty >= schedule.plannedQty) {
      schedule.status = 'RECEIVED';
      schedule.balanceQty = 0;
    } else {
      schedule.status = 'PARTIALLY_RECEIVED';
    }

    saveSchedule(schedule);

    // Record official receipt
    const receipt: Receipt = {
      id: `RCP-${Date.now()}`,
      scheduleId: schedule.id,
      arrivalRequestId: arrivalReq.id,
      rmCode: schedule.rmCode,
      rmDescription: schedule.rmDescription,
      approvedQty,
      receiptDate: arrivalReq.actualArrivalDate,
      approvedBy: req.user!.id,
      approvedByName: req.user!.name,
      notes: remarks || 'Full approval by PPIC',
      createdAt: new Date().toISOString(),
    };
    addReceipt(receipt);

    // Audit log
    addAuditLog({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'APPROVE_FULL_ARRIVAL',
      entityType: 'ARRIVAL_REQUEST',
      entityId: arrivalReq.id,
      oldValue: { receivedQty: oldReceived, balanceQty: oldBalance },
      newValue: { receivedQty: schedule.receivedQty, balanceQty: schedule.balanceQty, status: schedule.status },
      reason: remarks || 'PPIC verified and officially approved arrival in full',
    });

    // Notify Purchase
    addNotification({
      id: `NOTIF-${Date.now()}`,
      type: 'ARRIVAL_APPROVED',
      title: `Arrival Approved — RM ${schedule.rmCode}`,
      message: `PPIC approved full arrival of ${approvedQty} ${schedule.uom} for RM ${schedule.rmCode}. Official balance: ${schedule.balanceQty} ${schedule.uom}.`,
      targetRole: 'PURCHASE_TEAM',
      targetUserId: arrivalReq.purchaseUserId,
      scheduleId: schedule.id,
      rmCode: schedule.rmCode,
      readBy: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ arrivalRequest: arrivalReq, schedule, receipt });
  }
);

// PPIC Approve Partial Arrival
app.post(
  '/api/arrival-requests/:id/approve-partial',
  authenticateToken,
  requirePPIC,
  (req: AuthenticatedRequest, res: Response) => {
    const arrivalReq = getArrivalRequestById(req.params.id);
    if (!arrivalReq) {
      return res.status(404).json({ error: 'Arrival Request not found.' });
    }

    if (arrivalReq.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: `Request is already in ${arrivalReq.status} status.` });
    }

    const schedule = getScheduleById(arrivalReq.scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Associated RM Schedule not found.' });
    }

    const { verifiedQty, remarks } = req.body;
    const approvedQty = Number(verifiedQty);

    if (isNaN(approvedQty) || approvedQty <= 0) {
      return res.status(400).json({ error: 'Verified approved quantity must be greater than zero.' });
    }

    if (approvedQty > arrivalReq.reportedQty) {
      return res.status(400).json({
        error: `Verified quantity (${approvedQty}) cannot exceed reported quantity (${arrivalReq.reportedQty}).`,
      });
    }

    const todayStr = getKolkataDateString();

    // Update arrival request
    arrivalReq.status = 'PARTIALLY_APPROVED';
    arrivalReq.approvedQty = approvedQty;
    arrivalReq.reviewedAt = new Date().toISOString();
    arrivalReq.reviewedBy = req.user!.id;
    arrivalReq.reviewedByName = req.user!.name;
    arrivalReq.reviewerRemarks = remarks || 'Partial arrival approved by PPIC.';
    saveArrivalRequest(arrivalReq);

    // Update schedule official received quantity
    const oldReceived = schedule.receivedQty;
    const oldBalance = schedule.balanceQty;
    schedule.receivedQty = oldReceived + approvedQty;
    schedule.balanceQty = Math.max(0, schedule.plannedQty - schedule.receivedQty);
    schedule.updatedBy = req.user!.id;
    schedule.updatedAt = new Date().toISOString();

    if (schedule.receivedQty >= schedule.plannedQty) {
      schedule.status = 'RECEIVED';
      schedule.balanceQty = 0;
    } else {
      schedule.status = 'PARTIALLY_RECEIVED';
    }

    saveSchedule(schedule);

    // Record official receipt
    const receipt: Receipt = {
      id: `RCP-${Date.now()}`,
      scheduleId: schedule.id,
      arrivalRequestId: arrivalReq.id,
      rmCode: schedule.rmCode,
      rmDescription: schedule.rmDescription,
      approvedQty,
      receiptDate: arrivalReq.actualArrivalDate,
      approvedBy: req.user!.id,
      approvedByName: req.user!.name,
      notes: remarks || 'Partial receipt approved by PPIC',
      createdAt: new Date().toISOString(),
    };
    addReceipt(receipt);

    // Audit log
    addAuditLog({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'APPROVE_PARTIAL_ARRIVAL',
      entityType: 'ARRIVAL_REQUEST',
      entityId: arrivalReq.id,
      oldValue: { receivedQty: oldReceived, balanceQty: oldBalance },
      newValue: { receivedQty: schedule.receivedQty, balanceQty: schedule.balanceQty, status: schedule.status },
      reason: remarks || `PPIC approved partial verified quantity of ${approvedQty} (reported: ${arrivalReq.reportedQty})`,
    });

    // Notify Purchase
    addNotification({
      id: `NOTIF-${Date.now()}`,
      type: 'ARRIVAL_PARTIALLY_APPROVED',
      title: `Partial Arrival Approved — RM ${schedule.rmCode}`,
      message: `PPIC approved partial receipt of ${approvedQty} ${schedule.uom} (out of ${arrivalReq.reportedQty} reported). Remaining balance: ${schedule.balanceQty} ${schedule.uom}. Remarks: ${remarks || 'None'}`,
      targetRole: 'PURCHASE_TEAM',
      targetUserId: arrivalReq.purchaseUserId,
      scheduleId: schedule.id,
      rmCode: schedule.rmCode,
      readBy: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ arrivalRequest: arrivalReq, schedule, receipt });
  }
);

// PPIC Reject Arrival Request / Request Correction
app.post(
  '/api/arrival-requests/:id/reject',
  authenticateToken,
  requirePPIC,
  (req: AuthenticatedRequest, res: Response) => {
    const arrivalReq = getArrivalRequestById(req.params.id);
    if (!arrivalReq) {
      return res.status(404).json({ error: 'Arrival Request not found.' });
    }

    const { rejectionReason, requestCorrection } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection/correction reason is mandatory.' });
    }

    const schedule = getScheduleById(arrivalReq.scheduleId);

    arrivalReq.status = 'REJECTED';
    arrivalReq.reviewedAt = new Date().toISOString();
    arrivalReq.reviewedBy = req.user!.id;
    arrivalReq.reviewedByName = req.user!.name;
    arrivalReq.rejectionReason = rejectionReason;
    arrivalReq.correctionRequested = Boolean(requestCorrection);
    saveArrivalRequest(arrivalReq);

    // Recompute schedule status (does NOT touch official receivedQty)
    if (schedule) {
      const todayStr = getKolkataDateString();
      const otherPending = getArrivalRequests().some(
        (r) => r.id !== arrivalReq.id && r.scheduleId === schedule.id && r.status === 'PENDING_APPROVAL'
      );
      schedule.status = computeScheduleStatus(schedule, todayStr, otherPending);
      schedule.updatedBy = req.user!.id;
      schedule.updatedAt = new Date().toISOString();
      saveSchedule(schedule);
    }

    addAuditLog({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'REJECT_ARRIVAL_REQUEST',
      entityType: 'ARRIVAL_REQUEST',
      entityId: arrivalReq.id,
      reason: rejectionReason,
    });

    addNotification({
      id: `NOTIF-${Date.now()}`,
      type: 'ARRIVAL_REJECTED',
      title: `Arrival Request Rejected — RM ${arrivalReq.rmCode}`,
      message: `PPIC rejected arrival request for RM ${arrivalReq.rmCode} (${arrivalReq.reportedQty}). Reason: ${rejectionReason}. ${requestCorrection ? 'Please correct and resubmit.' : ''}`,
      targetRole: 'PURCHASE_TEAM',
      targetUserId: arrivalReq.purchaseUserId,
      scheduleId: arrivalReq.scheduleId,
      rmCode: arrivalReq.rmCode,
      readBy: [],
      createdAt: new Date().toISOString(),
    });

    res.json({ arrivalRequest: arrivalReq, schedule });
  }
);

// Purchase Resubmit Corrected Arrival Request
app.post(
  '/api/arrival-requests/:id/resubmit',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => {
    const prevReq = getArrivalRequestById(req.params.id);
    if (!prevReq) {
      return res.status(404).json({ error: 'Original arrival request not found.' });
    }

    const { actualArrivalDate, reportedQty, remarks, deliveryChallan, invoiceNumber, attachments } = req.body;
    const qty = Number(reportedQty);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Valid reported quantity required.' });
    }

    const schedule = getScheduleById(prevReq.scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'RM schedule not found.' });
    }

    const todayStr = getKolkataDateString();
    const dateFormatted = todayStr.replace(/-/g, '');
    const newId = `ARR-${dateFormatted}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReq: ArrivalRequest = {
      id: newId,
      scheduleId: schedule.id,
      rmCode: schedule.rmCode,
      rmDescription: schedule.rmDescription,
      plannedDate: schedule.plannedDate,
      plannedQty: schedule.plannedQty,
      currentApprovedQty: schedule.receivedQty,
      currentBalanceQty: schedule.balanceQty,
      actualArrivalDate: actualArrivalDate || prevReq.actualArrivalDate,
      reportedQty: qty,
      remarks: remarks || `Resubmitted following rejection. Original: ${prevReq.rejectionReason}`,
      supplier: prevReq.supplier,
      poNumber: prevReq.poNumber,
      deliveryChallan: deliveryChallan || prevReq.deliveryChallan,
      invoiceNumber: invoiceNumber || prevReq.invoiceNumber,
      attachments: attachments || prevReq.attachments,
      purchaseUserId: req.user!.id,
      purchaseUserName: req.user!.name,
      submittedAt: new Date().toISOString(),
      status: 'PENDING_APPROVAL',
    };

    saveArrivalRequest(newReq);

    schedule.status = 'ARRIVAL_PENDING_APPROVAL';
    saveSchedule(schedule);

    addAuditLog({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'RESUBMIT_ARRIVAL_REQUEST',
      entityType: 'ARRIVAL_REQUEST',
      entityId: newId,
      reason: `Corrected resubmission for prior request ${prevReq.id}`,
    });

    addNotification({
      id: `NOTIF-${Date.now()}`,
      type: 'ARRIVAL_REQUEST_SUBMITTED',
      title: `Corrected Arrival Request Resubmitted — RM ${schedule.rmCode}`,
      message: `Purchase resubmitted corrected arrival request for RM ${schedule.rmCode} (${qty} ${schedule.uom}). Verification requested.`,
      targetRole: 'PPIC_ADMIN',
      scheduleId: schedule.id,
      rmCode: schedule.rmCode,
      readBy: [],
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ arrivalRequest: newReq });
  }
);

// -------------------------------------------------------------
// Excel Import Routes
// -------------------------------------------------------------

app.post(
  '/api/excel/preview',
  authenticateToken,
  requirePPIC,
  upload.single('file'),
  (req: AuthenticatedRequest, res: Response) => {
    let fileBuffer: Buffer | null = null;
    let fileName = 'uploaded_plan.xlsx';

    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname;
    } else if (req.body && req.body.base64Data) {
      fileBuffer = Buffer.from(req.body.base64Data, 'base64');
      if (req.body.fileName) fileName = req.body.fileName;
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'No Excel file uploaded.' });
    }

    try {
      const mode = (req.body?.mode || req.query?.mode || 'APPEND') as 'APPEND' | 'REPLACE';
      const existing = getSchedules();
      const result = parseRMPlanningExcel(fileBuffer, fileName, existing, mode);
      res.json(result);
    } catch (err: any) {
      console.error('[Excel Preview Error]', err);
      res.status(400).json({ error: err.message || 'Failed to parse Excel file.' });
    }
  }
);

app.post(
  '/api/excel/confirm',
  authenticateToken,
  requirePPIC,
  (req: AuthenticatedRequest, res: Response) => {
    const { items, fileName, planningVersion, importMode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No valid items to import.' });
    }

    const todayStr = getKolkataDateString();
    const version = planningVersion || `v-${todayStr}-${Date.now().toString().slice(-4)}`;
    const sourceFileName = fileName || 'Uploaded_Plan.xlsx';
    const mode = (importMode === 'REPLACE' ? 'REPLACE' : 'APPEND') as 'APPEND' | 'REPLACE';

    // If REPLACE mode: clear old data first
    if (mode === 'REPLACE') {
      const clearedCount = clearAllSchedules();
      addAuditLog({
        id: `AUD-${Date.now()}-PURGE`,
        timestamp: new Date().toISOString(),
        userId: req.user!.id,
        userName: req.user!.name,
        role: req.user!.role,
        action: 'CLEAR_OLD_SCHEDULES',
        entityType: 'RM_SCHEDULE',
        entityId: 'ALL_SCHEDULES',
        reason: `PPIC Admin executed 'Clear Old Data & Add New Data'. Cleared ${clearedCount} old schedules prior to importing ${items.length} new records.`,
      });
    }

    let newCount = 0;
    let modifiedCount = 0;
    let unchangedCount = 0;

    for (const item of items) {
      const { rmCode, rmDescription, date, newQty, changeType } = item;
      const keyDate = date;

      // In REPLACE mode, every item is treated as fresh new schedule
      if (mode === 'REPLACE' || changeType === 'NEW') {
        const id = `SCH-${keyDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const schedule: RMSchedule = {
          id,
          rmCode,
          rmDescription,
          plannedDate: keyDate,
          plannedQty: newQty,
          receivedQty: 0,
          balanceQty: newQty,
          uom: 'KG',
          supplier: 'Pending Allocation',
          poNumber: 'Pending PO',
          priority: 'NORMAL',
          status: keyDate === todayStr ? 'DUE_TODAY' : keyDate < todayStr ? 'OVERDUE' : 'SCHEDULED',
          sourceFile: sourceFileName,
          planningVersion: version,
          createdBy: req.user!.id,
          createdAt: new Date().toISOString(),
          updatedBy: req.user!.id,
          updatedAt: new Date().toISOString(),
        };
        saveSchedule(schedule);
        newCount++;
      } else if (changeType === 'MODIFIED' && item.id) {
        const schedule = getScheduleById(item.id);
        if (schedule) {
          const oldQty = schedule.plannedQty;
          schedule.plannedQty = newQty;
          schedule.balanceQty = Math.max(0, newQty - schedule.receivedQty);
          schedule.planningVersion = version;
          schedule.sourceFile = sourceFileName;
          schedule.updatedBy = req.user!.id;
          schedule.updatedAt = new Date().toISOString();

          // Recalculate status
          const hasPending = getArrivalRequests().some(
            (r) => r.scheduleId === schedule.id && r.status === 'PENDING_APPROVAL'
          );
          schedule.status = computeScheduleStatus(schedule, todayStr, hasPending);
          saveSchedule(schedule);

          addScheduleHistory({
            id: `HIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            scheduleId: schedule.id,
            rmCode: schedule.rmCode,
            fieldChanged: 'plannedQty',
            oldValue: oldQty,
            newValue: newQty,
            reason: `Excel Import (${mode}): ${sourceFileName} (${version})`,
            changedBy: req.user!.id,
            changedByName: req.user!.name,
            changedAt: new Date().toISOString(),
          });
          modifiedCount++;
        }
      } else if (changeType === 'UNCHANGED') {
        unchangedCount++;
      }
    }

    const importRec = {
      id: `IMP-${Date.now()}`,
      fileName: sourceFileName,
      uploadedBy: req.user!.id,
      uploadedByName: req.user!.name,
      uploadedAt: new Date().toISOString(),
      totalRows: items.length,
      newSchedules: newCount,
      modifiedSchedules: modifiedCount,
      unchangedSchedules: unchangedCount,
      cancelledCandidates: 0,
      errorCount: 0,
      status: 'COMPLETED' as const,
      planningVersion: version,
      importMode: mode,
    };

    addImport(importRec);

    addAuditLog({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'EXCEL_IMPORT_CONFIRMED',
      entityType: 'IMPORT',
      entityId: importRec.id,
      newValue: { newCount, modifiedCount, unchangedCount, version, importMode: mode },
      reason: `PPIC confirmed Excel import of ${sourceFileName} [Mode: ${mode === 'REPLACE' ? 'CLEAR OLD DATA & REPLACE' : 'ADD WITH OLD DATA'}]`,
    });

    // Run scheduler evaluation to adjust notifications immediately
    evaluateSchedulesAndNotify();

    res.json({ success: true, importRecord: importRec });
  }
);

app.get('/api/excel/imports', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  res.json({ imports: getImports() });
});

// Download sample Excel template in standard matrix format
app.get('/api/excel/template', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    ['Child', 'Child Description', '03-10-26', '04-10-26', '05-10-26', '06-10-26', '07-10-26'],
    ['12000029', 'ALU NS CIRCLE 293*2.2 MM', 0, 0, 500, 0, 0],
    ['12000031', 'ALU NONSTICK RECTANGLE 339*349*3MM', 0, 450, 0, 0, 300],
    ['12000035', 'ALU NS CIRCLE 293*2.0MM', 0, 224.4, 0, 800, 0],
    ['12002696', 'ALU NS CIRCLE 435*2.6 MM', 0, 0, 1200, 0, 0],
    ['12002697', 'HANDLE PANIYARAKKAL', 2500, 0, 0, 0, 1500],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'RM_PLAN_MATRIX');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="RM_Planning_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// -------------------------------------------------------------
// Remarks & History Routes
// -------------------------------------------------------------

app.get('/api/remarks', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { scheduleId, rmCode } = req.query;
  const remarks = getRemarks(scheduleId as string, rmCode as string);
  res.json({ remarks });
});

app.post('/api/remarks', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { scheduleId, rmCode, category, remark } = req.body;
  if (!scheduleId || !rmCode || !category || !remark) {
    return res.status(400).json({ error: 'Schedule ID, RM Code, Category, and Remark are required.' });
  }

  const newRemark: RemarkRecord = {
    id: `REM-${Date.now()}`,
    scheduleId,
    rmCode,
    category,
    remark,
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    createdAt: new Date().toISOString(),
  };

  addRemark(newRemark);

  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'ADD_REMARK',
    entityType: 'REMARK',
    entityId: newRemark.id,
    reason: `Added remark under category ${category}`,
  });

  res.status(201).json({ remark: newRemark });
});

// -------------------------------------------------------------
// Notifications Routes
// -------------------------------------------------------------

app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let notifs = getNotifications();

  // Filter based on role
  notifs = notifs.filter(
    (n) =>
      n.targetRole === 'ALL' ||
      n.targetRole === user.role ||
      (n.targetUserId && n.targetUserId === user.id)
  );

  res.json({ notifications: notifs });
});

app.post('/api/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  markNotificationAsRead(req.params.id, req.user!.id);
  res.json({ success: true });
});

app.post('/api/notifications/run-evaluation', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const result = evaluateSchedulesAndNotify(true);
  res.json({ success: true, result });
});

// -------------------------------------------------------------
// Audit Logs & Settings
// -------------------------------------------------------------

app.get('/api/audit-logs', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const { entityType, search } = req.query;
  let logs = getAuditLogs();

  if (entityType && typeof entityType === 'string' && entityType !== 'ALL') {
    logs = logs.filter((l) => l.entityType === entityType);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.reason && l.reason.toLowerCase().includes(q)) ||
        l.entityId.toLowerCase().includes(q)
    );
  }

  res.json({ auditLogs: logs });
});

app.get('/api/settings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ settings: getSettings() });
});

app.put('/api/settings', authenticateToken, requirePPIC, (req: AuthenticatedRequest, res: Response) => {
  const updated = updateSettings(req.body);
  addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: req.user!.id,
    userName: req.user!.name,
    role: req.user!.role,
    action: 'UPDATE_SETTINGS',
    entityType: 'SETTINGS',
    entityId: 'SYSTEM_SETTINGS',
    newValue: req.body,
    reason: 'PPIC Admin modified system configuration',
  });
  res.json({ settings: updated });
});

// -------------------------------------------------------------
// Reporting & KPI APIs
// -------------------------------------------------------------

app.get('/api/reports/kpis', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const todayStr = getKolkataDateString();
  const schedules = getSchedules();
  const arrivalRequests = getArrivalRequests();

  const totalArrivals = schedules.length;
  const totalPlannedQty = schedules.reduce((acc, s) => acc + s.plannedQty, 0);
  const totalReceivedQty = schedules.reduce((acc, s) => acc + s.receivedQty, 0); // Official only
  const totalBalanceQty = schedules.reduce((acc, s) => acc + s.balanceQty, 0);

  const pendingApprovals = arrivalRequests.filter((r) => r.status === 'PENDING_APPROVAL');
  const pendingApprovalQty = pendingApprovals.reduce((acc, r) => acc + r.reportedQty, 0);

  const dueToday = schedules.filter((s) => s.plannedDate === todayStr && s.status !== 'CANCELLED');
  const overdue = schedules.filter(
    (s) => (s.plannedDate < todayStr && s.balanceQty > 0 && s.status !== 'CANCELLED') || s.status === 'OVERDUE'
  );
  const partiallyReceived = schedules.filter((s) => s.status === 'PARTIALLY_RECEIVED');

  // Next 3 days & Next 7 days
  const today = new Date(`${todayStr}T00:00:00Z`);
  const next3Days = schedules.filter((s) => {
    if (s.status === 'CANCELLED' || s.balanceQty <= 0) return false;
    const diff = Math.ceil((new Date(`${s.plannedDate}T00:00:00Z`).getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diff > 0 && diff <= 3;
  });

  const next7Days = schedules.filter((s) => {
    if (s.status === 'CANCELLED' || s.balanceQty <= 0) return false;
    const diff = Math.ceil((new Date(`${s.plannedDate}T00:00:00Z`).getTime() - today.getTime()) / (1000 * 3600 * 24));
    return diff > 0 && diff <= 7;
  });

  const cancelled = schedules.filter((s) => s.status === 'CANCELLED');

  res.json({
    kpis: {
      totalArrivals,
      totalPlannedQty,
      totalReceivedQty, // PPIC Approved ONLY
      totalBalanceQty,
      pendingApprovalCount: pendingApprovals.length,
      pendingApprovalQty,
      dueTodayCount: dueToday.length,
      next3DaysCount: next3Days.length,
      next7DaysCount: next7Days.length,
      overdueCount: overdue.length,
      partiallyReceivedCount: partiallyReceived.length,
      cancelledCount: cancelled.length,
    },
    todayStr,
  });
});

// Export report as Excel
app.get('/api/reports/export', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.query; // 'schedules' | 'receipts' | 'overdue' | 'pending'
  const schedules = getSchedules();
  const receipts = getReceipts();
  const arrivalReqs = getArrivalRequests();
  const todayStr = getKolkataDateString();

  const wb = XLSX.utils.book_new();

  if (type === 'overdue') {
    const overdueList = schedules.filter(
      (s) => (s.plannedDate < todayStr && s.balanceQty > 0 && s.status !== 'CANCELLED') || s.status === 'OVERDUE'
    );
    const data = [
      ['RM Code', 'Description', 'Planned Date', 'Planned Qty', 'Received Qty', 'Balance Qty', 'UOM', 'Supplier', 'PO #', 'Status'],
      ...overdueList.map((s) => [
        s.rmCode,
        s.rmDescription,
        s.plannedDate,
        s.plannedQty,
        s.receivedQty,
        s.balanceQty,
        s.uom,
        s.supplier,
        s.poNumber,
        s.status,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Overdue_RM');
  } else if (type === 'receipts') {
    const data = [
      ['Receipt ID', 'Schedule ID', 'Arrival Req ID', 'RM Code', 'Description', 'Approved Qty', 'Receipt Date', 'Approved By', 'Notes'],
      ...receipts.map((r) => [
        r.id,
        r.scheduleId,
        r.arrivalRequestId,
        r.rmCode,
        r.rmDescription,
        r.approvedQty,
        r.receiptDate,
        r.approvedByName,
        r.notes || '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Official_Receipts');
  } else {
    // All schedules
    const data = [
      ['Schedule ID', 'RM Code', 'Description', 'Planned Date', 'Planned Qty', 'Received Qty', 'Balance Qty', 'UOM', 'Supplier', 'PO #', 'Priority', 'Status'],
      ...schedules.map((s) => [
        s.id,
        s.rmCode,
        s.rmDescription,
        s.plannedDate,
        s.plannedQty,
        s.receivedQty,
        s.balanceQty,
        s.uom,
        s.supplier,
        s.poNumber,
        s.priority,
        s.status,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'RM_Schedules_Master');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="RM_Report_${type || 'all'}_${todayStr}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// -------------------------------------------------------------
// Gemini AI Assistant Routes
// -------------------------------------------------------------

app.post('/api/ai/chat', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question string is required.' });
  }

  const user = req.user!;
  try {
    const result = await askAIAssistant(question, user.role, user.name);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI assistant query failed.' });
  }
});

app.get('/api/ai/daily-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const summary = await generateDailySummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Daily summary generation failed.' });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Production Serving
// -------------------------------------------------------------

async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupFrontend().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Raw Material Arrival Control running on http://0.0.0.0:${PORT}`);
    startBackgroundScheduler();
  });
});

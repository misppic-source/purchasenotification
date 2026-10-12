import {
  getDatabase,
  saveDatabase,
  getSchedules,
  saveSchedule,
  getArrivalRequests,
  addNotification,
  hasNotificationBeenSent,
  recordNotificationLog,
  computeScheduleStatus,
  getSettings,
  updateSettings,
} from './db';
import { NotificationRecord } from './types';

/**
 * Returns current date string in Asia/Kolkata (YYYY-MM-DD)
 */
export function getKolkataDateString(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // returns YYYY-MM-DD
  return formatter.format(now);
}

/**
 * Run full evaluation of all active RM schedules:
 * 1. Recalculate status
 * 2. Send 3-day reminder
 * 3. Send 1-day reminder
 * 4. Send Due Today alert
 * 5. Send Daily Overdue alert (every day while balance > 0)
 * 6. Deduplicate alerts via notification_logs
 */
export function evaluateSchedulesAndNotify(force = false): {
  evaluatedCount: number;
  notificationsCreated: number;
  statusUpdatedCount: number;
} {
  const todayStr = getKolkataDateString();
  const settings = getSettings();
  const schedules = getSchedules();
  const arrivalRequests = getArrivalRequests();

  let notificationsCreated = 0;
  let statusUpdatedCount = 0;

  const today = new Date(`${todayStr}T00:00:00Z`);

  for (const sch of schedules) {
    if (sch.status === 'CANCELLED') continue;

    // Check if there is any pending arrival request for this schedule
    const hasPendingArrival = arrivalRequests.some(
      (r) => r.scheduleId === sch.id && r.status === 'PENDING_APPROVAL'
    );

    // Compute updated status
    const newStatus = computeScheduleStatus(sch, todayStr, hasPendingArrival);
    if (newStatus !== sch.status) {
      sch.status = newStatus;
      sch.updatedAt = new Date().toISOString();
      saveSchedule(sch);
      statusUpdatedCount++;
    }

    // Stop reminders if fully received or cancelled
    if (sch.receivedQty >= sch.plannedQty || sch.balanceQty <= 0) {
      continue;
    }

    const planned = new Date(`${sch.plannedDate}T00:00:00Z`);
    const diffTime = planned.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    // 1. 3 DAYS BEFORE REMINDER
    if (diffDays === 3 && settings.alert3DaysBefore) {
      const logKey = `${sch.id}_REMINDER_3_DAYS_${todayStr}`;
      if (!hasNotificationBeenSent(logKey)) {
        const notif: NotificationRecord = {
          id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'REMINDER_3_DAYS',
          title: `Upcoming RM Arrival (3 Days) — ${sch.rmCode}`,
          message: `RM ${sch.rmCode} — ${sch.rmDescription} is scheduled to arrive in 3 days (${sch.plannedDate}) with planned quantity ${sch.plannedQty} ${sch.uom}.`,
          targetRole: 'ALL',
          scheduleId: sch.id,
          rmCode: sch.rmCode,
          readBy: [],
          createdAt: new Date().toISOString(),
        };
        addNotification(notif);
        recordNotificationLog(logKey);
        notificationsCreated++;
      }
    }

    // 2. 1 DAY BEFORE REMINDER
    if (diffDays === 1 && settings.alert1DayBefore) {
      const logKey = `${sch.id}_REMINDER_1_DAY_${todayStr}`;
      if (!hasNotificationBeenSent(logKey)) {
        const notif: NotificationRecord = {
          id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'REMINDER_1_DAY',
          title: `RM Arrival Tomorrow — ${sch.rmCode}`,
          message: `RM ${sch.rmCode} — ${sch.rmDescription} is scheduled to arrive tomorrow (${sch.plannedDate}). Expected: ${sch.balanceQty} ${sch.uom}.`,
          targetRole: 'ALL',
          scheduleId: sch.id,
          rmCode: sch.rmCode,
          readBy: [],
          createdAt: new Date().toISOString(),
        };
        addNotification(notif);
        recordNotificationLog(logKey);
        notificationsCreated++;
      }
    }

    // 3. DUE TODAY ALERT
    if (diffDays === 0 && settings.alertDueToday) {
      const logKey = `${sch.id}_DUE_TODAY_${todayStr}`;
      if (!hasNotificationBeenSent(logKey)) {
        const notif: NotificationRecord = {
          id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'DUE_TODAY',
          title: `RM Due Today — ${sch.rmCode}`,
          message: `RM ${sch.rmCode} is due today (${todayStr})! Expected quantity: ${sch.balanceQty} ${sch.uom} from ${sch.supplier || 'supplier'}. Purchase team please monitor gate arrival.`,
          targetRole: 'ALL',
          scheduleId: sch.id,
          rmCode: sch.rmCode,
          readBy: [],
          createdAt: new Date().toISOString(),
        };
        addNotification(notif);
        recordNotificationLog(logKey);
        notificationsCreated++;
      }
    }

    // 4. OVERDUE ALERT (Sent DAILY while balance > 0)
    if (diffDays < 0 && sch.balanceQty > 0 && settings.alertDailyOverdue) {
      const daysOverdue = Math.abs(diffDays);
      const logKey = `${sch.id}_OVERDUE_${todayStr}`;
      if (!hasNotificationBeenSent(logKey)) {
        const notif: NotificationRecord = {
          id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'OVERDUE',
          title: `CRITICAL: Overdue RM Alert (${daysOverdue}d) — ${sch.rmCode}`,
          message: `RM ${sch.rmCode} — ${sch.rmDescription} is OVERDUE by ${daysOverdue} day(s). Planned Date: ${sch.plannedDate}. Remaining Balance: ${sch.balanceQty} ${sch.uom}. Supplier: ${sch.supplier || 'N/A'}. PO: ${sch.poNumber || 'N/A'}. Action required immediately!`,
          targetRole: 'ALL',
          scheduleId: sch.id,
          rmCode: sch.rmCode,
          readBy: [],
          createdAt: new Date().toISOString(),
        };
        addNotification(notif);
        recordNotificationLog(logKey);
        notificationsCreated++;
      }
    }
  }

  updateSettings({ lastDailyRun: todayStr });

  return {
    evaluatedCount: schedules.length,
    notificationsCreated,
    statusUpdatedCount,
  };
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function startBackgroundScheduler(): void {
  console.log('[Scheduler] Background notification engine initialized for Asia/Kolkata.');
  // Run immediately on boot
  try {
    evaluateSchedulesAndNotify();
  } catch (err) {
    console.error('[Scheduler] Initial evaluation error:', err);
  }

  // Run periodic check every 3 minutes (ensures notifications trigger reliably regardless of browser state)
  schedulerTimer = setInterval(() => {
    try {
      evaluateSchedulesAndNotify();
    } catch (err) {
      console.error('[Scheduler] Periodic evaluation error:', err);
    }
  }, 3 * 60 * 1000);
}

export function stopBackgroundScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

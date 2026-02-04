import { supabase } from '../supabase';

export type NotificationType = 'application' | 'shift' | 'timesheet' | 'payment' | 'dispute';

export type CreateNotificationOptions = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
};

/**
 * Create a notification for a user
 * SIMPLIFIED VERSION - Direct insert without .select() to avoid RLS read-back issues
 */
export async function createNotification(
  options: CreateNotificationOptions
): Promise<{ id: string } | null> {
  try {
    // Log with timestamp for debugging
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[NOTIF ${timestamp}] Creating: ${options.type} for ${options.userId.substring(0, 8)}...`);

    const insertData = {
      user_id: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      link: options.link,
      is_read: false,
    };

    // CRITICAL FIX: Don't use .select().single() after insert
    // RLS SELECT policy only allows reading own notifications
    // When employer creates notification for worker, SELECT fails (different user_id)
    // But the INSERT still succeeds! We just can't read it back.
    const { error } = await supabase
      .from('notifications')
      .insert(insertData);

    if (error) {
      console.error(`[NOTIF ${timestamp}] ❌ INSERT FAILED:`, error.code, '-', error.message);
      
      // Provide specific guidance based on error code
      if (error.code === '42501') {
        console.error('[NOTIF] 🔴 RLS POLICY ERROR - Run SQL: 20250111_fix_notifications_final.sql');
      } else if (error.code === '23514') {
        console.error('[NOTIF] 🔴 CHECK CONSTRAINT - Invalid type. Valid: application, shift, timesheet, payment, dispute');
      } else if (error.code === '23503') {
        console.error('[NOTIF] 🔴 FOREIGN KEY - User ID not found in profiles table');
      } else if (error.code === '42P01') {
        console.error('[NOTIF] 🔴 TABLE MISSING - notifications table does not exist');
      }
      
      return null;
    }

    console.log(`[NOTIF ${timestamp}] ✅ SUCCESS: Created for ${options.userId.substring(0, 8)}`);
    return { id: 'created-' + Date.now() };
  } catch (err) {
    console.error('[NOTIF] ❌ EXCEPTION:', err);
    return null;
  }
}

/**
 * Create multiple notifications at once
 */
export async function createNotifications(
  notifications: CreateNotificationOptions[]
): Promise<string[]> {
  if (!notifications.length) {
    console.log('[NOTIF] No notifications to create');
    return [];
  }

  console.log(`[NOTIF] Creating ${notifications.length} notifications...`);
  
  const results: string[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const notification of notifications) {
    const result = await createNotification(notification);
    if (result?.id) {
      results.push(result.id);
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`[NOTIF] BATCH COMPLETE: ✅ ${successCount} success, ❌ ${failCount} failed`);
  
  if (failCount > 0 && successCount === 0) {
    console.error('[NOTIF] ⚠️ ALL NOTIFICATIONS FAILED! Check RLS policies and table structure.');
  }
  
  return results;
}

/**
 * Send notifications to workers when employer posts a new shift
 * UPDATED: Only notify workers who can see the shift based on visibility
 */
export async function notifyWorkersAboutNewShift(
  shiftId: string,
  employerId: string,
  shiftData: {
    job_title: string;
    location: string;
    visibility?: 'internal' | 'marketplace' | 'both';
    experience_level?: string | null;
    required_skills?: string[] | null;
  }
): Promise<number> {
  try {
    console.log('[NOTIF] Notifying workers about new shift:', shiftId, 'visibility:', shiftData.visibility);

    // Get shift visibility (default to 'marketplace' for backward compatibility)
    const visibility = shiftData.visibility || 'marketplace';

    // Build base query for workers
    let workersQuery = supabase
      .from('profiles')
      .select('id, marketplace_enabled, employed_by, is_blocked')
      .eq('user_type', 'worker')
      .eq('is_blocked', false); // Don't notify blocked workers

    // Filter workers based on visibility
    if (visibility === 'internal') {
      // Only notify workers employed by this employer
      const { data: workers, error } = await workersQuery;
      
      if (error) {
        console.error('[NOTIF] Error fetching workers:', error.message);
        return 0;
      }

      if (!workers?.length) {
        console.log('[NOTIF] No workers found');
        return 0;
      }

      // Filter workers who are employed by this employer
      const eligibleWorkers = workers.filter(worker => {
        const employedBy = worker.employed_by || [];
        if (!Array.isArray(employedBy)) return false;
        
        return employedBy.some((emp: any) => 
          emp.employer_id === employerId && 
          (emp.status === 'active' || emp.status === null)
        );
      });

      if (eligibleWorkers.length === 0) {
        console.log('[NOTIF] No eligible internal workers found');
        return 0;
      }

      const notifications: CreateNotificationOptions[] = eligibleWorkers.map(w => ({
        userId: w.id,
        type: 'shift' as NotificationType,
        title: 'New Internal Shift Available',
        message: `New shift from your employer: ${shiftData.job_title} at ${shiftData.location || 'TBD'}. Check it out!`,
        link: `/worker/shift/${shiftId}`,
      }));

      const results = await createNotifications(notifications);
      console.log(`[NOTIF] ✅ Sent ${results.length} notifications to internal workers`);
      return results.length;

    } else if (visibility === 'marketplace') {
      // Only notify marketplace-enabled workers
      const { data: workers, error } = await workersQuery
        .or('marketplace_enabled.eq.true,marketplace_enabled.is.null'); // Include null as true for backward compatibility

      if (error) {
        console.error('[NOTIF] Error fetching workers:', error.message);
        return 0;
      }

      if (!workers?.length) {
        console.log('[NOTIF] No marketplace workers found');
        return 0;
      }

      const notifications: CreateNotificationOptions[] = workers.map(w => ({
        userId: w.id,
        type: 'shift' as NotificationType,
        title: 'New Shift Available',
        message: `New shift: ${shiftData.job_title} at ${shiftData.location || 'TBD'}. Apply now!`,
        link: `/worker/shift/${shiftId}`,
      }));

      const results = await createNotifications(notifications);
      console.log(`[NOTIF] ✅ Sent ${results.length} notifications to marketplace workers`);
      return results.length;

    } else if (visibility === 'both') {
      // Notify both: marketplace workers AND internal employees
      const { data: allWorkers, error } = await workersQuery;

      if (error) {
        console.error('[NOTIF] Error fetching workers:', error.message);
        return 0;
      }

      if (!allWorkers?.length) {
        console.log('[NOTIF] No workers found');
        return 0;
      }

      // Filter eligible workers
      const eligibleWorkers = allWorkers.filter(worker => {
        // Marketplace workers
        if (worker.marketplace_enabled === true || worker.marketplace_enabled === null) return true;
        
        // Internal employees
        const employedBy = worker.employed_by || [];
        if (Array.isArray(employedBy)) {
          return employedBy.some((emp: any) => 
            emp.employer_id === employerId && 
            (emp.status === 'active' || emp.status === null)
          );
        }
        
        return false;
      });

      // Remove duplicates (workers who are both marketplace and internal)
      const uniqueWorkers = Array.from(
        new Map(eligibleWorkers.map(w => [w.id, w])).values()
      );

      if (uniqueWorkers.length === 0) {
        console.log('[NOTIF] No eligible workers found');
        return 0;
      }

      const notifications: CreateNotificationOptions[] = uniqueWorkers.map(w => ({
        userId: w.id,
        type: 'shift' as NotificationType,
        title: 'New Shift Available',
        message: `New shift: ${shiftData.job_title} at ${shiftData.location || 'TBD'}. Apply now!`,
        link: `/worker/shift/${shiftId}`,
      }));

      const results = await createNotifications(notifications);
      console.log(`[NOTIF] ✅ Sent ${results.length} notifications (both marketplace and internal)`);
      return results.length;
    }

    return 0;
  } catch (err) {
    console.error('[NOTIF] Error in notifyWorkersAboutNewShift:', err);
    return 0;
  }
}

/**
 * Send shift reminder notification to worker
 */
export async function sendShiftReminder(
  workerId: string,
  shiftId: string,
  shiftData: { job_title: string; shift_date: string; start_time: string },
  hoursUntil: number
): Promise<boolean> {
  let message = hoursUntil >= 24
    ? `Your shift "${shiftData.job_title}" starts in ${Math.floor(hoursUntil / 24)} day(s).`
    : hoursUntil >= 1
    ? `Your shift "${shiftData.job_title}" starts in ${Math.floor(hoursUntil)} hour(s).`
    : `Your shift "${shiftData.job_title}" starts soon!`;

  const result = await createNotification({
    userId: workerId,
    type: 'shift',
    title: 'Shift Reminder',
    message,
    link: `/worker/shift/${shiftId}`,
  });

  return result !== null;
}

/**
 * Send clock-in reminder to worker
 */
export async function sendClockInReminder(
  workerId: string,
  shiftId: string,
  shiftData: { job_title: string; start_time: string }
): Promise<boolean> {
  const result = await createNotification({
    userId: workerId,
    type: 'timesheet',
    title: 'Time to Clock In',
    message: `Clock in for: "${shiftData.job_title}" starting at ${shiftData.start_time}`,
    link: `/worker/shift/${shiftId}`,
  });

  return result !== null;
}

/**
 * Send clock-out reminder to worker
 */
export async function sendClockOutReminder(
  workerId: string,
  shiftId: string,
  shiftData: { job_title: string; end_time: string }
): Promise<boolean> {
  const result = await createNotification({
    userId: workerId,
    type: 'timesheet',
    title: 'Time to Clock Out',
    message: `Clock out for: "${shiftData.job_title}" ending at ${shiftData.end_time}`,
    link: `/worker/shift/${shiftId}`,
  });

  return result !== null;
}

/**
 * Send timesheet confirmation reminder to employer
 */
export async function sendTimesheetConfirmationReminder(
  employerId: string,
  timesheetId: string,
  shiftData: { job_title: string },
  hoursSinceClockOut: number
): Promise<boolean> {
  const message = hoursSinceClockOut >= 22
    ? `⚠️ URGENT: Timesheet for "${shiftData.job_title}" auto-approves soon!`
    : `Please confirm timesheet for "${shiftData.job_title}"`;

  const result = await createNotification({
    userId: employerId,
    type: 'timesheet',
    title: 'Timesheet Confirmation Reminder',
    message,
    link: `/employer/timesheet/${timesheetId}`,
  });

  return result !== null;
}

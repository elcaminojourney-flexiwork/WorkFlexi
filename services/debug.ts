/**
 * DEV ONLY - Cleanup helper functions
 * 
 * These functions are for one-off data cleanup and should be removed after use.
 * DO NOT use in production.
 */

import { supabase } from '../supabase';

/**
 * Cleanup shifts that should be completed or in_progress based on payment/dispute status
 * 
 * Finds shifts where:
 * - Timesheet exists with employer_confirmed = true AND payment status is released/mock_released → set status = 'completed'
 * - Dispute exists with status IN ('open', 'investigating') AND shift.status = 'open' → set status = 'in_progress'
 * 
 * @returns Object with counts of shifts updated
 */
export async function cleanupShiftStatuses(): Promise<{
  completedUpdated: number;
  inProgressUpdated: number;
  errors: string[];
}> {
  console.log('[DEV CLEANUP] Starting shift status cleanup...');
  const errors: string[] = [];
  let completedUpdated = 0;
  let inProgressUpdated = 0;

  try {
    // 1) Find shifts that should be completed (timesheet confirmed + payment released)
    const { data: completedShifts, error: completedError } = await supabase
      .from('timesheets')
      .select('shift_id, employer_confirmed')
      .eq('employer_confirmed', true);

    if (completedError) {
      errors.push(`Failed to load timesheets: ${completedError.message}`);
    } else if (completedShifts) {
      const shiftIds = Array.from(new Set(completedShifts.map((ts) => ts.shift_id)));
      
      if (shiftIds.length > 0) {
        // Check which of these have released payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('shift_id')
          .in('shift_id', shiftIds)
          .in('status', ['released', 'mock_released']);

        if (paymentsData) {
          const completedShiftIds = Array.from(
            new Set(paymentsData.map((p) => p.shift_id))
          );

          // Update shifts to completed
          for (const shiftId of completedShiftIds) {
            const { error: updateError } = await supabase
              .from('shifts')
              .update({ status: 'completed' })
              .eq('id', shiftId)
              .neq('status', 'completed'); // Only update if not already completed

            if (updateError) {
              errors.push(`Failed to update shift ${shiftId} to completed: ${updateError.message}`);
            } else {
              completedUpdated++;
              console.log(`[DEV CLEANUP] Updated shift ${shiftId} to completed`);
            }
          }
        }
      }
    }

    // 2) Find shifts that should be in_progress (have active disputes but status is 'open')
    // Note: disputes table doesn't have shift_id - we need to get it via timesheets
    const { data: disputesData, error: disputesError } = await supabase
      .from('disputes')
      .select('timesheet_id')
      .in('status', ['open', 'investigating']);

    if (disputesError) {
      errors.push(`Failed to load disputes: ${disputesError.message}`);
    } else if (disputesData && disputesData.length > 0) {
      // Get timesheet_ids from disputes
      const timesheetIds = Array.from(new Set(disputesData.map((d: any) => d.timesheet_id).filter(Boolean)));
      
      if (timesheetIds.length > 0) {
        // Load timesheets to get shift_ids
        const { data: timesheetsData, error: tsError } = await supabase
          .from('timesheets')
          .select('shift_id')
          .in('id', timesheetIds);

        if (tsError) {
          errors.push(`Failed to load timesheets for disputes: ${tsError.message}`);
        } else if (timesheetsData) {
          const disputedShiftIds = Array.from(new Set(timesheetsData.map((ts: any) => ts.shift_id).filter(Boolean)));

          if (disputedShiftIds.length > 0) {
            // Update shifts with status 'open' to 'in_progress'
            for (const shiftId of disputedShiftIds) {
              const { error: updateError } = await supabase
                .from('shifts')
                .update({ status: 'in_progress' })
                .eq('id', shiftId)
                .eq('status', 'open'); // Only update if currently 'open'

              if (updateError) {
                errors.push(`Failed to update shift ${shiftId} to in_progress: ${updateError.message}`);
              } else {
                // Check if update actually happened (might already be in_progress)
                const { data: shiftData } = await supabase
                  .from('shifts')
                  .select('status')
                  .eq('id', shiftId)
                  .single();

                if (shiftData?.status === 'in_progress') {
                  inProgressUpdated++;
                  console.log(`[DEV CLEANUP] Updated shift ${shiftId} to in_progress`);
                }
              }
            }
          }
        }
      }
    }

    console.log('[DEV CLEANUP] Cleanup complete:', {
      completedUpdated,
      inProgressUpdated,
      errors: errors.length,
    });

    return {
      completedUpdated,
      inProgressUpdated,
      errors,
    };
  } catch (err: any) {
    console.error('[DEV CLEANUP] Exception during cleanup:', err);
    errors.push(`Exception: ${err?.message || 'Unknown error'}`);
    return {
      completedUpdated,
      inProgressUpdated,
      errors,
    };
  }
}

/**
 * DEBUG: Log all shifts for an employer with their related data
 * 
 * Shows the real DB state: shift status, confirmed timesheets, released payments, open disputes
 * 
 * @param employerId - The employer's user ID
 */
export async function debugLogEmployerShifts(employerId: string): Promise<void> {
  try {
    // Query all shifts for this employer
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id, title, job_title, status')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });

    if (shiftsError) {
      console.error('[DEBUG] Failed to load shifts:', shiftsError);
      return;
    }

    if (!shifts || shifts.length === 0) {
      console.log('[DEBUG] No shifts found for employer:', employerId);
      return;
    }

    const shiftIds = shifts.map((s) => s.id);

    // Check timesheets with employer_confirmed = true
    const { data: confirmedTimesheets } = await supabase
      .from('timesheets')
      .select('shift_id')
      .in('shift_id', shiftIds)
      .eq('employer_confirmed', true);

    const confirmedShiftIds = new Set(
      (confirmedTimesheets || []).map((ts) => ts.shift_id)
    );

    // Check payments with released status
    const { data: releasedPayments } = await supabase
      .from('payments')
      .select('shift_id')
      .in('shift_id', shiftIds)
      .in('status', ['released', 'mock_released']);

    const releasedPaymentShiftIds = new Set(
      (releasedPayments || []).map((p) => p.shift_id)
    );

    // Check open disputes (disputes table doesn't have shift_id - get via timesheets)
    const { data: timesheetsForShifts } = await supabase
      .from('timesheets')
      .select('id, shift_id')
      .in('shift_id', shiftIds);

    const timesheetIds = new Set(
      (timesheetsForShifts || []).map((ts: any) => ts.id)
    );

    const { data: openDisputes } = await supabase
      .from('disputes')
      .select('timesheet_id')
      .in('timesheet_id', Array.from(timesheetIds))
      .in('status', ['open', 'investigating']);

    // Map disputed timesheet_ids back to shift_ids
    const disputedTimesheetIds = new Set(
      (openDisputes || []).map((d: any) => d.timesheet_id)
    );
    const disputedShiftIds = new Set(
      (timesheetsForShifts || [])
        .filter((ts: any) => disputedTimesheetIds.has(ts.id))
        .map((ts: any) => ts.shift_id)
    );

    // Build result array
    const resultArray = shifts.map((shift) => ({
      id: shift.id,
      title: shift.title || shift.job_title || 'Untitled',
      status: shift.status,
      hasConfirmedTimesheet: confirmedShiftIds.has(shift.id),
      hasReleasedPayment: releasedPaymentShiftIds.has(shift.id),
      hasOpenDispute: disputedShiftIds.has(shift.id),
    }));

    console.log('DEBUG employer shifts:', resultArray);
  } catch (err: any) {
    console.error('[DEBUG] Exception in debugLogEmployerShifts:', err);
  }
}


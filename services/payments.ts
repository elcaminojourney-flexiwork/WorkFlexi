/**
 * Payment Service - Escrow Creation & Finalization
 * 
 * Creates escrow payment records when employers post shifts.
 * Finalizes payments when employers confirm timesheets.
 * This is Step 1: Simulated escrow (no real Stripe API yet).
 */

import { supabase } from '../supabase';
import { createNotification } from './notifications';
import { calculateHoursFromTimes } from './timesheets';

/**
 * Generate a unique invoice number
 * Format: INV-YYYYMMDD-XXXXXXXX (date + first 8 chars of shift/timesheet ID)
 */
function generateInvoiceNumber(shiftId: string, timesheetId?: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const idStr = (timesheetId || shiftId).slice(0, 8).toUpperCase();
  return `INV-${dateStr}-${idStr}`;
}

/**
 * Create invoice record in Supabase
 */
async function createInvoiceRecord(data: {
  shiftId: string;
  timesheetId: string;
  employerId: string;
  workerId: string;
  shift: { job_title: string | null; shift_date: string | null; location: string | null };
  payment: {
    regularHours: number;
    regularAmount: number;
    overtimeHours: number;
    overtimeAmount: number;
    subtotal: number;
    platformFee: number;
    platformFeePercentage: number;
    totalCharged: number;
    workerPayout: number;
  };
}): Promise<string | null> {
  try {
    const invoiceNumber = generateInvoiceNumber(data.shiftId, data.timesheetId);
    
    // Build insert data - use new column structure (migration will add missing columns)
    const insertData: any = {
      invoice_number: invoiceNumber,
      shift_id: data.shiftId,
      payment_id: null, // Will be nullable after migration
      employer_id: data.employerId,
      worker_id: data.workerId,
      // New structure columns (migration will add these if missing)
      timesheet_id: data.timesheetId,
      regular_hours: data.payment.regularHours,
      regular_amount: data.payment.regularAmount,
      overtime_hours: data.payment.overtimeHours,
      overtime_amount: data.payment.overtimeAmount,
      subtotal: data.payment.subtotal,
      platform_fee: data.payment.platformFee,
      platform_fee_percentage: data.payment.platformFeePercentage,
      total_charged: data.payment.totalCharged,
      worker_payout: data.payment.workerPayout,
      status: 'issued',
      // Optional shift details
      job_title: data.shift.job_title,
      shift_date: data.shift.shift_date,
      location: data.shift.location,
    };
    
    console.log('[INVOICE] Attempting to create invoice:', {
      invoice_number: invoiceNumber,
      shift_id: data.shiftId,
      employer_id: data.employerId,
      total: data.payment.totalCharged,
    });
    
    // Insert invoice with actual table structure
    let { data: invoice, error } = await supabase
      .from('invoices')
      .insert(insertData)
      .select('id, invoice_number')
      .single();

    // If insert succeeded, we're done
    if (!error && invoice?.id) {
      console.log('[INVOICE] ✅ Invoice created successfully:', { 
        invoiceId: invoice.id, 
        invoiceNumber: invoice.invoice_number || invoiceNumber 
      });
      return invoice.id;
    }

    // Handle other errors
    if (error) {
      // Log full error for debugging
      console.error('[INVOICE] Full error object:', JSON.stringify(error, null, 2));
      console.error('[INVOICE] Error code:', error.code);
      console.error('[INVOICE] Error message:', error.message);
      
      // Check for RLS policy errors (42501 = insufficient_privilege)
      if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
        console.error('[INVOICE] ❌ RLS policy blocking invoice creation');
        console.error('[INVOICE] Run migration: supabase/migrations/20250106000002_disable_invoices_rls.sql');
        return null;
      }
      
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('[INVOICE] ❌ Invoices table does not exist');
        console.error('[INVOICE] Run migration: supabase/migrations/20250106000000_create_invoices_table.sql');
        return null;
      }
      
      if (error.code === '23505') {
        // Duplicate invoice number - generate new one
        const timestamp = Date.now().toString().slice(-6);
        const newInvoiceNumber = `${invoiceNumber}-${timestamp}`;
        console.log('[INVOICE] Duplicate invoice number, retrying with:', newInvoiceNumber);
        
        const retryData = { ...insertData, invoice_number: newInvoiceNumber };
        const retryResult = await supabase
          .from('invoices')
          .insert(retryData)
          .select('id, invoice_number')
          .single();
        
        if (!retryResult.error && retryResult.data?.id) {
          console.log('[INVOICE] ✅ Invoice created with new number:', retryResult.data.id);
          return retryResult.data.id;
        }
      }
      
      console.error('[INVOICE] ❌ Failed to create invoice:', error.code, error.message);
      return null;
    }

    return null;
  } catch (err) {
    console.error('[INVOICE] Exception creating invoice:', err);
    return null;
  }
}

const PAYMENTS_ENABLED = false; // temporary dev flag – do NOT remove

export type CreateEscrowOptions = {
  shiftId: string;
  employerId: string;
  estimatedHours: number; // Total estimated hours (after break deduction, for all workers)
  hourlyRate: number;
  platformFeePercentage?: number; // Default: 0.15 (15%)
};

export type EscrowRecord = {
  id: string;
  shift_id: string;
  timesheet_id: string | null;
  application_id: string | null;
  worker_id: string | null;
  employer_id: string;
  regular_hours: number;
  regular_amount: number;
  overtime_hours: number;
  overtime_amount: number;
  subtotal: number;
  platform_fee: number;
  platform_fee_percentage: number;
  total_charged: number;
  worker_payout: number | null;
  status: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  payment_captured_at: string | null;
  released_at: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Create escrow payment record for a shift
 * 
 * Called when employer posts a shift. Creates a payment record
 * with status 'held_in_escrow' to hold funds until shift completion.
 * 
 * @param options - Escrow creation parameters
 * @returns Created escrow payment record
 * @throws Error if escrow creation fails
 */
export async function createEscrowForShift(
  options: CreateEscrowOptions
): Promise<EscrowRecord> {
  const {
    shiftId,
    employerId,
    estimatedHours,
    hourlyRate,
    platformFeePercentage = 0.15,
  } = options;

  // Mock mode: bypass Supabase completely
  if (!PAYMENTS_ENABLED) {
    console.log('[PAYMENTS MOCK] createEscrowForShift called', { options });

    // Validate inputs (still validate even in mock mode)
    if (!shiftId || !employerId) {
      throw new Error('Shift ID and Employer ID are required');
    }

    if (estimatedHours <= 0 || hourlyRate <= 0) {
      throw new Error('Estimated hours and hourly rate must be greater than zero');
    }

    if (platformFeePercentage < 0 || platformFeePercentage > 1) {
      throw new Error('Platform fee percentage must be between 0 and 1');
    }

    // Calculate payment amounts (same as real mode)
    const regularHours = estimatedHours;
    const regularAmount = Math.round(regularHours * hourlyRate * 100) / 100;
    const overtimeHours = 0;
    const overtimeAmount = 0;
    const subtotal = Math.round((regularAmount + overtimeAmount) * 100) / 100;
    const platformFee = Math.round(subtotal * platformFeePercentage * 100) / 100;
    const totalCharged = Math.round((subtotal + platformFee) * 100) / 100;

    // Return mock EscrowRecord
    const now = new Date().toISOString();
    return {
      id: 'mock-' + shiftId,
      shift_id: shiftId,
      timesheet_id: null,
      application_id: null,
      worker_id: null,
      employer_id: employerId,
      regular_hours: regularHours,
      regular_amount: regularAmount,
      overtime_hours: overtimeHours,
      overtime_amount: overtimeAmount,
      subtotal: subtotal,
      platform_fee: platformFee,
      platform_fee_percentage: platformFeePercentage,
      total_charged: totalCharged,
      worker_payout: null,
      status: 'mock_held',
      stripe_payment_intent_id: null,
      stripe_transfer_id: null,
      payment_captured_at: null,
      released_at: null,
      refund_amount: null,
      refund_reason: null,
      refunded_at: null,
      created_at: now,
      updated_at: now,
    };
  }

  // Real mode: use Supabase
  try {
    // Validate inputs
    if (!shiftId || !employerId) {
      throw new Error('Shift ID and Employer ID are required');
    }

    if (estimatedHours <= 0 || hourlyRate <= 0) {
      throw new Error('Estimated hours and hourly rate must be greater than zero');
    }

    if (platformFeePercentage < 0 || platformFeePercentage > 1) {
      throw new Error('Platform fee percentage must be between 0 and 1');
    }

    // Calculate payment amounts
    const regularHours = estimatedHours; // For escrow, all hours are regular (overtime calculated later from actual timesheet)
    const regularAmount = Math.round(regularHours * hourlyRate * 100) / 100;
    const overtimeHours = 0; // No overtime in escrow estimate
    const overtimeAmount = 0;
    const subtotal = Math.round((regularAmount + overtimeAmount) * 100) / 100;
    const platformFee = Math.round(subtotal * platformFeePercentage * 100) / 100;
    const totalCharged = Math.round((subtotal + platformFee) * 100) / 100;

    // Create escrow payment record
    const paymentData = {
      shift_id: shiftId,
      timesheet_id: null, // Will be set when timesheet is created
      application_id: null, // Not assigned yet
      worker_id: null, // Not assigned yet - will be set when worker is accepted
      employer_id: employerId,
      regular_hours: regularHours,
      regular_amount: regularAmount,
      overtime_hours: overtimeHours,
      overtime_amount: overtimeAmount,
      subtotal: subtotal,
      platform_fee: platformFee,
      platform_fee_percentage: platformFeePercentage,
      total_charged: totalCharged,
      worker_payout: null, // Will be calculated from actual timesheet
      status: 'held_in_escrow',
      stripe_payment_intent_id: null, // Will be set when integrated with Stripe
      stripe_transfer_id: null, // Will be set when integrated with Stripe
      payment_captured_at: null,
      released_at: null,
      refund_amount: null,
      refund_reason: null,
      refunded_at: null,
      // created_at and updated_at will be set by database defaults
    };

    // Debug: Get authenticated user ID
    const { data: authUser } = await supabase.auth.getUser();
    console.log('PAYMENT RLS DEBUG AUTH', authUser?.user?.id);

    // Debug: Log payment data before insert
    console.log('PAYMENT RLS DEBUG', {
      paymentData,
      employerId: employerId,
    });

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('Escrow creation error:', error);
      throw new Error(`Failed to create escrow: ${error.message}`);
    }

    if (!payment) {
      throw new Error('Escrow creation returned no data');
    }

    return payment as EscrowRecord;
  } catch (error) {
    console.error('Error creating escrow:', error);
    throw error;
  }
}

export type FinalizePaymentOptions = {
  timesheetId: string;
};

export type FinalizePaymentResult = {
  payment: EscrowRecord;
  shiftUpdated: boolean;
  workerEarningsCreated: boolean;
};

/**
 * Finalize payment for a confirmed timesheet
 * 
 * Called when employer confirms a timesheet. This function:
 * 1. Finds the escrow payment for the shift (status = 'held_in_escrow')
 * 2. Reads actual hours from the timesheet
 * 3. Calculates final payment amounts
 * 4. Updates the payment record with status = 'released'
 * 5. Inserts into worker_earnings if table exists
 * 6. Updates shift status to 'completed'
 * 
 * @param options - Finalization parameters
 * @returns Finalized payment record and operation results
 * @throws Error if finalization fails
 */
export async function finalizePaymentForTimesheet(
  options: FinalizePaymentOptions
): Promise<FinalizePaymentResult> {
  const { timesheetId } = options;

  // Mock mode: Treat payment as made when employer confirms (no Supabase payment records)
  if (!PAYMENTS_ENABLED) {
    console.log('[PAYMENTS MOCK] finalizePaymentForTimesheet called', { timesheetId });

    // 1) Load the timesheet with full details
    const { data: timesheet, error: tsError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single();

    if (tsError || !timesheet) {
      throw new Error(`Timesheet not found: ${tsError?.message || 'Unknown error'}`);
    }

    if (!timesheet.clock_in_time || !timesheet.clock_out_time) {
      throw new Error('Timesheet must have both clock-in and clock-out times');
    }

    if (!timesheet.shift_id) {
      throw new Error('Timesheet must be linked to a shift');
    }

    // 2) Load the shift to get hourly rate and other details
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('id, hourly_rate, overtime_multiplier, employer_id, job_title, shift_date, location')
      .eq('id', timesheet.shift_id)
      .single();

    if (shiftError || !shift) {
      throw new Error(`Shift not found: ${shiftError?.message || 'Unknown error'}`);
    }

    if (!shift.hourly_rate) {
      throw new Error('Shift must have an hourly rate');
    }

    // 3) Calculate actual hours from timesheet using the same logic as payment summary
    // This ensures invoice matches what's shown in the payment summary
    const hoursCalculation = calculateHoursFromTimes({
      clockIn: timesheet.clock_in_time,
      clockOut: timesheet.clock_out_time,
      breakMinutes: timesheet.break_duration_minutes ?? undefined,
      minimumHours: 4,
      overtimeThresholdHours: 8,
    });

    const regularHours = hoursCalculation.regularHours;
    const overtimeHours = hoursCalculation.overtimeHours;

    // Calculate amounts (using same logic as payment summary)
    const hourlyRate = shift.hourly_rate;
    const overtimeMultiplier = shift.overtime_multiplier || 1;
    const regularAmount = Math.round(regularHours * hourlyRate * 100) / 100;
    const overtimeAmount = Math.round(overtimeHours * hourlyRate * overtimeMultiplier * 100) / 100;
    const subtotal = Math.round((regularAmount + overtimeAmount) * 100) / 100;
    
    // Platform fee (15%) - charged to employer only, NOT deducted from worker
    const platformFeePercentage = 0.15;
    const platformFee = Math.round(subtotal * platformFeePercentage * 100) / 100;
    const totalCharged = Math.round((subtotal + platformFee) * 100) / 100;
    // Worker receives full subtotal - platform fee is only charged to employer
    const workerPayout = subtotal;

    // 4) Update shift status to 'completed' (payment is considered made)
    let shiftUpdated = false;
    try {
      const { error: shiftUpdateError } = await supabase
        .from('shifts')
        .update({ status: 'completed' })
        .eq('id', timesheet.shift_id);

      if (shiftUpdateError) {
        console.error('[PAYMENTS MOCK] ❌ Failed to update shift status:', shiftUpdateError);
        throw new Error(`Failed to update shift status: ${shiftUpdateError.message}`);
      }
      
      shiftUpdated = true;
      console.log('[PAYMENTS MOCK] ✅ Shift status updated to completed', { 
        timesheetId, 
        shiftId: timesheet.shift_id 
      });
    } catch (shiftErr: any) {
      console.error('[PAYMENTS MOCK] ❌ Error updating shift status:', shiftErr);
      // Don't throw - continue with invoice creation, but log the error
    }

    // 5) Invoice is generated on-the-fly from timesheet data (no separate table needed)
    // The invoice page loads directly from timesheet/shift data and calculates payment breakdown
    console.log('[PAYMENTS MOCK] ✅ Payment finalized. Invoice can be viewed from timesheet data.');

    // 6) Notifications - In mock mode, we don't create actual notification records
    // They are treated as if created (for testing purposes)
    // When real payments are enabled, notifications will be created via the notification service
    console.log('[PAYMENTS MOCK] Notifications treated as created (mock mode - no Supabase records)');
    if (shift.employer_id) {
      console.log('[PAYMENTS MOCK] 📧 Notification would be sent to employer:', {
        userId: shift.employer_id,
        title: 'Payment Released Successfully',
        message: `Payment of SGD $${totalCharged.toFixed(2)} has been released for shift: ${shift.job_title || 'Shift'}`,
      });
    }
    if (timesheet.worker_id) {
      console.log('[PAYMENTS MOCK] 📧 Notification would be sent to worker:', {
        userId: timesheet.worker_id,
        title: 'You\'ve Been Paid!',
        message: `You received SGD $${workerPayout.toFixed(2)} for shift: ${shift.job_title || 'Shift'}`,
      });
    }

    // 6) Return mock payment result (for compatibility, but no Supabase record created)
    const now = new Date().toISOString();
    return {
      payment: {
        id: 'mock-' + timesheetId, // Mock ID for compatibility
        shift_id: timesheet.shift_id,
        timesheet_id: timesheetId,
        application_id: null,
        worker_id: timesheet.worker_id,
        employer_id: shift.employer_id,
        regular_hours: regularHours,
        regular_amount: regularAmount,
        overtime_hours: overtimeHours,
        overtime_amount: overtimeAmount,
        subtotal: subtotal,
        platform_fee: platformFee,
        platform_fee_percentage: platformFeePercentage,
        total_charged: totalCharged,
        worker_payout: workerPayout,
        status: 'mock_released',
        stripe_payment_intent_id: null,
        stripe_transfer_id: null,
        payment_captured_at: now,
        released_at: now,
        refund_amount: null,
        refund_reason: null,
        refunded_at: null,
        created_at: now,
        updated_at: now,
      } as EscrowRecord,
      shiftUpdated: shiftUpdated,
      workerEarningsCreated: false,
    };
  }

  // Real mode: use Supabase
  try {
    // 1) Load the timesheet
    const { data: timesheet, error: tsError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('id', timesheetId)
      .single();

    if (tsError || !timesheet) {
      throw new Error(`Timesheet not found: ${tsError?.message || 'Unknown error'}`);
    }

    if (!timesheet.clock_in_time || !timesheet.clock_out_time) {
      throw new Error('Timesheet must have both clock-in and clock-out times');
    }

    if (!timesheet.shift_id) {
      throw new Error('Timesheet must be linked to a shift');
    }

    // 2) Load the shift to get hourly rate and job title (for notifications)
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('id, hourly_rate, employer_id, job_title')
      .eq('id', timesheet.shift_id)
      .single();

    if (shiftError || !shift) {
      throw new Error(`Shift not found: ${shiftError?.message || 'Unknown error'}`);
    }

    if (!shift.hourly_rate) {
      throw new Error('Shift must have an hourly rate');
    }

    // 3) Find the escrow payment for this shift
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('shift_id', timesheet.shift_id)
      .eq('status', 'held_in_escrow')
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentError) {
      throw new Error(`Failed to find escrow payment: ${paymentError.message}`);
    }

    if (!payments || payments.length === 0) {
      throw new Error('No escrow payment found for this shift');
    }

    const escrowPayment = payments[0] as EscrowRecord;

    // 4) Calculate actual hours from timesheet
    const clockIn = new Date(timesheet.clock_in_time);
    const clockOut = new Date(timesheet.clock_out_time);
    
    let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60);
    if (totalMinutes <= 0) {
      totalMinutes += 24 * 60; // Handle overnight shifts
    }

    // Apply break deduction if applicable
    const breakMinutes = timesheet.break_duration_minutes || 0;
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);
    const totalHours = workMinutes / 60;

    // Calculate regular hours (up to 8 hours, overtime = 0 as per user's rules)
    const regularHours = Math.min(totalHours, 8);
    const overtimeHours = 0; // As per user's rules: overtime_hours = 0
    const overtimeAmount = 0;

    // Calculate amounts
    const hourlyRate = shift.hourly_rate;
    const regularAmount = Math.round(regularHours * hourlyRate * 100) / 100;
    const subtotal = Math.round((regularAmount + overtimeAmount) * 100) / 100;
    
    // Platform fee percentage from escrow (default 0.15)
    const platformFeePercentage = escrowPayment.platform_fee_percentage || 0.15;
    const platformFee = Math.round(subtotal * platformFeePercentage * 100) / 100;
    const totalCharged = Math.round((subtotal + platformFee) * 100) / 100;
    const workerPayout = Math.round((subtotal - platformFee) * 100) / 100;

    // 5) Update the payment record
    const now = new Date().toISOString();
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        timesheet_id: timesheetId,
        worker_id: timesheet.worker_id,
        regular_hours: regularHours,
        regular_amount: regularAmount,
        overtime_hours: overtimeHours,
        overtime_amount: overtimeAmount,
        subtotal: subtotal,
        platform_fee: platformFee,
        total_charged: totalCharged,
        worker_payout: workerPayout,
        status: 'released',
        payment_captured_at: now,
        released_at: now,
      })
      .eq('id', escrowPayment.id)
      .select()
      .single();

    if (updateError || !updatedPayment) {
      throw new Error(`Failed to update payment: ${updateError?.message || 'Unknown error'}`);
    }

    // 6) Try to insert into worker_earnings if table exists
    let workerEarningsCreated = false;
    if (timesheet.worker_id) {
      try {
        const { error: earningsError } = await supabase
          .from('worker_earnings')
          .insert({
            worker_id: timesheet.worker_id,
            payment_id: updatedPayment.id,
            shift_id: timesheet.shift_id,
            timesheet_id: timesheetId,
            gross_amount: subtotal,
            platform_fee_amount: platformFee,
            net_amount: workerPayout,
            period_month: new Date().toISOString().slice(0, 7), // YYYY-MM format
          });

        if (!earningsError) {
          workerEarningsCreated = true;
        } else {
          // Table might not exist, log but don't fail
          console.log('Note: worker_earnings table may not exist:', earningsError.message);
        }
      } catch (err) {
        // Table might not exist, log but don't fail
        console.log('Note: worker_earnings insert skipped:', err);
      }
    }

    // 7) Update shift status to 'completed'
    console.log('finalizePaymentForTimesheet updating shift to completed', { 
      timesheetId, 
      shiftId: timesheet.shift_id 
    });
    
    const { data: updatedShift, error: shiftUpdateError } = await supabase
      .from('shifts')
      .update({
        status: 'completed',
      })
      .eq('id', timesheet.shift_id)
      .select('id, status')
      .single();

    if (shiftUpdateError) {
      console.error('❌ finalizePaymentForTimesheet FAILED to update shift status:', shiftUpdateError, { 
        timesheetId, 
        shiftId: timesheet.shift_id 
      });
      // Don't throw - payment is already finalized
    } else {
      console.log('✅ finalizePaymentForTimesheet updated shift to completed', { 
        timesheetId, 
        shiftId: timesheet.shift_id,
        updatedShiftStatus: updatedShift?.status 
      });
    }

    // 8) Create notifications for employer and worker
    // CRITICAL: Create notifications after payment is finalized and shift is completed
    // This ensures both parties are notified immediately
    const shiftJobTitle = shift.job_title || 'Shift';
    
    // Create notification for employer
    if (shift.employer_id) {
      try {
        await createNotification({
          userId: shift.employer_id,
          type: 'payment',
          title: 'Payment Released Successfully',
          message: `Payment of SGD $${totalCharged.toFixed(2)} has been released for shift: ${shiftJobTitle}`,
          link: `/employer/payment/${updatedPayment.id}`,
        });
        console.log('✅ Notification created for employer', { employerId: shift.employer_id });
      } catch (notifErr) {
        // Don't fail payment finalization if notification fails
        console.error('❌ Failed to create employer notification (non-critical):', notifErr);
      }
    }

    // Create notification for worker
    if (timesheet.worker_id) {
      try {
        await createNotification({
          userId: timesheet.worker_id,
          type: 'payment',
          title: 'You\'ve Been Paid!',
          message: `You received SGD $${workerPayout.toFixed(2)} for shift: ${shiftJobTitle}`,
          link: `/worker/earning/${updatedPayment.id}`, // Will create this page in Step 2
        });
        console.log('✅ Notification created for worker', { workerId: timesheet.worker_id });
      } catch (notifErr) {
        // Don't fail payment finalization if notification fails
        console.error('❌ Failed to create worker notification (non-critical):', notifErr);
      }
    }

    return {
      payment: updatedPayment as EscrowRecord,
      shiftUpdated: !shiftUpdateError,
      workerEarningsCreated,
    };
  } catch (error) {
    console.error('Error finalizing payment:', error);
    throw error;
  }
}

